/**
 * expoPush.js — Production-grade Expo push notification utility
 *
 * Key guarantees:
 *  • Sends in chunks of 100 (Expo /push/send hard limit)
 *  • Checks receipts in chunks of 300 (Expo /push/getReceipts hard limit)
 *  • Immediately removes DeviceNotRegistered tokens detected at send time
 *  • Schedules a delayed receipt pass to catch async delivery failures
 *  • All network/DB errors are caught so a push failure never crashes a request
 *
 * Production note:
 *  The 30-second delayed receipt check is appropriate for a soft-launch.
 *  At scale, store ticket IDs in a dedicated collection and process them via
 *  a dedicated cron job (e.g., every 30 minutes) to avoid holding server
 *  memory for large broadcasts.
 */

import User from '../models/User.js';

// ─── Expo API endpoints ───────────────────────────────────────────────────────
const EXPO_PUSH_URL    = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts';

// ─── Hard limits from Expo documentation ─────────────────────────────────────
const SEND_CHUNK_SIZE    = 100;  // max messages per /push/send call
const RECEIPT_CHUNK_SIZE = 300;  // max IDs per /push/getReceipts call

// ─── Expo notification channel → Android channel mapping ─────────────────────
const CHANNEL_MAP = {
  messages:  'messages',
  items:     'items',
  lostFound: 'campus',
  events:    'campus',
  sports:    'campus',
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

/**
 * Validates that a token looks like a real Expo push token.
 * Rejects nulls, empty strings, and non-Expo tokens before hitting the API.
 */
function isValidExpoPushToken(token) {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Broadcast a push notification to every opted-in user in a college.
 *
 * @param {object} opts
 * @param {string}   opts.college        - College identifier string
 * @param {string}  [opts.excludeUserId] - User ID to exclude (e.g. the sender)
 * @param {string}  [opts.prefKey]       - Pref key: 'items'|'lostFound'|'events'|'sports'|'messages'
 * @param {string}   opts.title          - Notification title
 * @param {string}   opts.body           - Notification body
 * @param {object}  [opts.data]          - Custom data payload for deep-linking
 */
export async function sendPushToCollege({
  college,
  excludeUserId,
  prefKey,
  title,
  body,
  data = {},
}) {
  try {
    const query = {
      college,
      pushSubscription: { $exists: true, $not: { $size: 0 } },
    };
    if (excludeUserId) query._id = { $ne: excludeUserId };

    const users = await User.find(query, 'pushSubscription notificationPrefs');

    const tokens = users
      .filter((u) => {
        const p = u.notificationPrefs;
        if (p?.all === false) return false;
        if (prefKey && p?.[prefKey] === false) return false;
        return true;
      })
      .flatMap((u) => u.pushSubscription || [])
      .filter(isValidExpoPushToken);

    if (!tokens.length) return;

    await _sendAndProcess(tokens, title, body, data, prefKey);
  } catch (err) {
    console.warn('[ExpoPush] sendPushToCollege failed:', err.message);
  }
}

/**
 * Send a push notification to a single user (respects their notification prefs).
 *
 * @param {object} opts
 * @param {string}  opts.userId   - Target user's MongoDB _id
 * @param {string} [opts.prefKey] - Pref key to check
 * @param {string}  opts.title
 * @param {string}  opts.body
 * @param {object} [opts.data]
 */
export async function sendPushToUser({ userId, prefKey, title, body, data = {} }) {
  try {
    const user = await User.findById(userId, 'pushSubscription notificationPrefs');
    if (!user) return;

    const p = user.notificationPrefs;
    if (p?.all === false) return;
    if (prefKey && p?.[prefKey] === false) return;

    const tokens = (user.pushSubscription || []).filter(isValidExpoPushToken);
    if (!tokens.length) return;

    await _sendAndProcess(tokens, title, body, data, prefKey);
  } catch (err) {
    console.warn('[ExpoPush] sendPushToUser failed:', err.message);
  }
}

// ─── Core internals ───────────────────────────────────────────────────────────

/**
 * Builds messages, chunk-sends them, handles immediate dead tokens,
 * and schedules a delayed receipt check.
 */
async function _sendAndProcess(tokens, title, body, data, prefKey) {
  const channelId = CHANNEL_MAP[prefKey] || 'campus';

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    android: { channelId, priority: 'high' },
    // iOS badge count is managed separately; omit to avoid overriding
  }));

  const { ticketToToken, immediateDeadTokens } = await _sendChunked(messages);

  // Remove dead tokens found synchronously during the send pass
  if (immediateDeadTokens.length > 0) {
    _removeDeadTokens(immediateDeadTokens).catch(() => {});
  }

  // Async receipt check — non-blocking, runs after Expo has processed deliveries.
  // For a soft-launch with < 10k users per college, 30s is sufficient.
  // Move to a cron job once you exceed that scale.
  if (ticketToToken.size > 0) {
    setTimeout(() => {
      _processReceipts(ticketToToken).catch(() => {});
    }, 30 * 1000);
  }
}

/**
 * Sends messages to Expo in SEND_CHUNK_SIZE batches.
 *
 * Returns:
 *  - ticketToToken: Map<ticketId, pushToken> for receipt follow-up
 *  - immediateDeadTokens: tokens that were already dead at send time
 */
async function _sendChunked(messages) {
  const chunks = chunkArray(messages, SEND_CHUNK_SIZE);
  const ticketToToken = new Map();
  const immediateDeadTokens = [];

  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.warn(`[ExpoPush] HTTP ${res.status} from /push/send: ${text}`);
        continue; // Skip this chunk; don't abort the whole broadcast
      }

      const json = await res.json();
      if (!Array.isArray(json.data)) continue;

      json.data.forEach((ticket, i) => {
        const token = chunk[i].to;

        if (ticket.status === 'ok' && ticket.id) {
          // Receipt ID returned — track for the follow-up check
          ticketToToken.set(ticket.id, token);
        } else if (
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered'
        ) {
          // Token is already stale — clean up immediately
          immediateDeadTokens.push(token);
        } else if (ticket.status === 'error') {
          // Other errors (MessageTooBig, InvalidCredentials, etc.) — log only
          console.warn(
            `[ExpoPush] Send error for token ${token.slice(0, 30)}…: `,
            ticket.details?.error || ticket.message
          );
        }
      });
    } catch (err) {
      console.warn('[ExpoPush] Chunk send network error:', err.message);
      // Continue to the next chunk — best-effort delivery
    }
  }

  return { ticketToToken, immediateDeadTokens };
}

/**
 * Queries Expo for delivery receipts and removes any DeviceNotRegistered tokens.
 *
 * @param {Map<string, string>} ticketToToken  - Map of ticketId → pushToken
 */
async function _processReceipts(ticketToToken) {
  const ticketIds = [...ticketToToken.keys()];
  if (!ticketIds.length) return;

  const chunks = chunkArray(ticketIds, RECEIPT_CHUNK_SIZE);
  const deadTokens = [];

  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_RECEIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ids: chunk }),
      });

      if (!res.ok) {
        console.warn(`[ExpoPush] HTTP ${res.status} from /push/getReceipts`);
        continue;
      }

      const json = await res.json();
      const receipts = json.data || {};

      for (const [id, receipt] of Object.entries(receipts)) {
        if (
          receipt.status === 'error' &&
          receipt.details?.error === 'DeviceNotRegistered'
        ) {
          const token = ticketToToken.get(id);
          if (token) deadTokens.push(token);
        }
      }
    } catch (err) {
      console.warn('[ExpoPush] Receipt check network error:', err.message);
    }
  }

  if (deadTokens.length > 0) {
    await _removeDeadTokens(deadTokens);
  }
}

/**
 * Bulk-removes an array of stale push tokens from all users in one DB round-trip.
 */
async function _removeDeadTokens(tokens) {
  try {
    const result = await User.updateMany(
      { pushSubscription: { $in: tokens } },
      { $pull: { pushSubscription: { $in: tokens } } }
    );
    if (result.modifiedCount > 0) {
      console.log(
        `[ExpoPush] Cleaned up ${tokens.length} dead token(s) from ${result.modifiedCount} user(s)`
      );
    }
  } catch (err) {
    // Log but never throw — dead-token cleanup must never surface to a request
    console.warn('[ExpoPush] Failed to remove dead tokens:', err.message);
  }
}

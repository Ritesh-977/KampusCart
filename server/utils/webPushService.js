/**
 * webPushService.js — Web push (VAPID) broadcast helpers
 *
 * Mirrors the interface of expoPush.js so controllers can call both
 * side-by-side. Operates only on subscription objects (endpoint + keys)
 * stored inside pushSubscription[]. Expo string tokens are ignored here.
 */

import webpush from './webPush.js';
import User    from '../models/User.js';

// ─── Guard ────────────────────────────────────────────────────────────────────

/** True when the entry is a real Web Push subscription object (not an Expo string). */
function isWebSub(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.endpoint === 'string' &&
    entry.endpoint.length > 0 &&
    entry.keys
  );
}

// ─── Dead-subscription cleanup ────────────────────────────────────────────────

/** Pull a single stale web subscription from a user's array (HTTP 410/404). */
async function _removeSub(userId, sub) {
  try {
    await User.updateOne({ _id: userId }, { $pull: { pushSubscription: sub } });
  } catch { /* cleanup failure must never surface */ }
}

// ─── Core send ────────────────────────────────────────────────────────────────

async function _dispatch(userId, subs, payload) {
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          _removeSub(userId, sub).catch(() => {});
        } else {
          console.warn('[WebPush] sendNotification error:', err.statusCode, err.message);
        }
      }
    })
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Broadcast a web push notification to every opted-in user in a college.
 *
 * @param {object} opts
 * @param {string}   opts.college
 * @param {string}  [opts.excludeUserId]
 * @param {string}  [opts.prefKey]       — 'items'|'lostFound'|'events'|'sports'|'messages'
 * @param {string}   opts.title
 * @param {string}   opts.body
 * @param {string}  [opts.url]           — Deep-link URL opened when notification is clicked
 * @param {string}  [opts.icon]          — Notification icon URL
 */
export async function sendWebPushToCollege({
  college,
  excludeUserId,
  prefKey,
  title,
  body,
  url   = '/',
  icon  = '/logo.png',
}) {
  try {
    const query = {
      college,
      pushSubscription: { $exists: true, $not: { $size: 0 } },
    };
    if (excludeUserId) query._id = { $ne: excludeUserId };

    const users = await User.find(query, 'pushSubscription notificationPrefs');

    for (const user of users) {
      const p = user.notificationPrefs;
      if (p?.all === false) continue;
      if (prefKey && p?.[prefKey] === false) continue;

      const subs = (user.pushSubscription || []).filter(isWebSub);
      if (!subs.length) continue;

      const payload = JSON.stringify({ title, body, url, icon });
      await _dispatch(user._id, subs, payload);
    }
  } catch (err) {
    console.warn('[WebPush] sendWebPushToCollege failed:', err.message);
  }
}

/**
 * Send a web push notification to a single user (respects their notification prefs).
 *
 * @param {object} opts
 * @param {string}  opts.userId
 * @param {string} [opts.prefKey]
 * @param {string}  opts.title
 * @param {string}  opts.body
 * @param {string} [opts.url]
 */
export async function sendWebPushToUser({ userId, prefKey, title, body, url = '/' }) {
  try {
    const user = await User.findById(userId, 'pushSubscription notificationPrefs');
    if (!user) return;

    const p = user.notificationPrefs;
    if (p?.all === false) return;
    if (prefKey && p?.[prefKey] === false) return;

    const subs = (user.pushSubscription || []).filter(isWebSub);
    if (!subs.length) return;

    const payload = JSON.stringify({ title, body, url });
    await _dispatch(userId, subs, payload);
  } catch (err) {
    console.warn('[WebPush] sendWebPushToUser failed:', err.message);
  }
}

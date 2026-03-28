import User from '../models/User.js';

const CHANNEL_MAP = {
  messages: 'messages',
  items:    'items',
  lostFound: 'campus',
  events:   'campus',
  sports:   'campus',
};

// Send Expo push to all users in a college (filtered by notification prefs)
export async function sendPushToCollege({ college, excludeUserId, prefKey, title, body, data = {} }) {
  try {
    const query = {
      college,
      pushSubscription: { $exists: true, $not: { $size: 0 } },
    };
    if (excludeUserId) query._id = { $ne: excludeUserId };

    const users = await User.find(query, 'pushSubscription notificationPrefs');

    const tokens = users
      .filter(u => {
        const p = u.notificationPrefs;
        if (p?.all === false) return false;
        if (prefKey && p?.[prefKey] === false) return false;
        return true;
      })
      .flatMap(u => u.pushSubscription || [])
      .filter(t => typeof t === 'string' && t.startsWith('ExponentPushToken'));

    if (!tokens.length) return;
    await _send(tokens, title, body, data, prefKey);
  } catch (e) {
    console.warn('[ExpoPush] sendPushToCollege failed:', e.message);
  }
}

// Send Expo push to a single user
export async function sendPushToUser({ userId, prefKey, title, body, data = {} }) {
  try {
    const user = await User.findById(userId, 'pushSubscription notificationPrefs');
    if (!user) return;

    const p = user.notificationPrefs;
    if (p?.all === false) return;
    if (prefKey && p?.[prefKey] === false) return;

    const tokens = (user.pushSubscription || [])
      .filter(t => typeof t === 'string' && t.startsWith('ExponentPushToken'));

    if (!tokens.length) return;
    await _send(tokens, title, body, data, prefKey);
  } catch (e) {
    console.warn('[ExpoPush] sendPushToUser failed:', e.message);
  }
}

async function _send(tokens, title, body, data, prefKey) {
  const channelId = CHANNEL_MAP[prefKey] || 'campus';
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    android: { channelId, priority: 'high' },
  }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });
}

/**
 * usePushNotifications.js — Production-grade Expo push notification hook
 *
 * Handles three distinct app states:
 *  1. Foreground  — notification banner shown while app is open
 *  2. Background  — user taps banner while app is backgrounded
 *  3. Killed      — user taps banner after fully closing the app
 *                   (handled via getLastNotificationResponseAsync with a
 *                   navigator-readiness polling loop)
 *
 * Routing contract (data payload fields expected from the server):
 *  Chat:      { chatId, senderId, senderName, senderPic? }
 *  Item:      { type: 'item' }
 *  LostFound: { type: 'lostFound' }
 *  Event:     { type: 'event' }
 *  Sport:     { type: 'sport' }
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import API from '../api/axios';

// Show notification banner even when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Permission + token registration ─────────────────────────────────────────

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('[Push] Push notifications require a physical device.');
    return null;
  }

  // Set up Android notification channels before requesting permission
  if (Platform.OS === 'android') {
    const channels = [
      { id: 'messages', name: 'Messages',      color: '#6366f1' },
      { id: 'items',    name: 'New Listings',   color: '#34d399' },
      { id: 'campus',   name: 'Campus Updates', color: '#f472b6' },
    ];
    for (const ch of channels) {
      await Notifications.setNotificationChannelAsync(ch.id, {
        name: ch.name,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: ch.color,
        sound: 'default',
      });
    }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Notification permission denied.');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch (err) {
    console.warn('[Push] Failed to get Expo push token:', err.message);
    return null;
  }
}

// ─── Navigation helper ────────────────────────────────────────────────────────

/**
 * Polls navigationRef.isReady() before navigating.
 * Critical for the killed-state case where the navigator may still be mounting.
 *
 * @param {React.RefObject} navigationRef
 * @param {Function}        routeAction   — called once navigator is ready
 * @param {number}          [maxAttempts] — give up after this many polls
 */
function navigateWhenReady(navigationRef, routeAction, maxAttempts = 15) {
  let attempts = 0;

  const tryOnce = () => {
    attempts += 1;
    if (navigationRef?.current?.isReady()) {
      routeAction();
    } else if (attempts < maxAttempts) {
      setTimeout(tryOnce, 200);
    } else {
      console.warn('[Push] Navigator not ready after maximum polling attempts.');
    }
  };

  // Small initial delay gives the NavigationContainer time to mount
  setTimeout(tryOnce, 100);
}

// ─── Notification router ──────────────────────────────────────────────────────

/**
 * Maps a notification data payload to the correct React Navigation action.
 * All routing is validated against known types — unknown types are silently ignored.
 *
 * @param {object}          data          — notification.request.content.data
 * @param {React.RefObject} navigationRef
 */
function routeNotification(data, navigationRef) {
  if (!data || !navigationRef?.current) return;

  // ── Chat message ──────────────────────────────────────────────────────────
  if (data.chatId) {
    navigateWhenReady(navigationRef, () => {
      navigationRef.current.navigate('ChatTab', {
        screen: 'ChatRoom',
        params: {
          chat: { _id: data.chatId, users: [] },
          otherUser: {
            _id: data.senderId,
            name: data.senderName  || 'Unknown',
            profilePic: data.senderPic || '',
          },
        },
      });
    });
    return;
  }

  // ── Type-based routing ────────────────────────────────────────────────────
  const KNOWN_TYPES = new Set(['item', 'lostFound', 'event', 'sport']);

  if (!data.type || !KNOWN_TYPES.has(data.type)) {
    // Ignore malformed or unknown payloads — never crash for an unknown type
    return;
  }

  switch (data.type) {
    case 'item':
      navigateWhenReady(navigationRef, () => {
        navigationRef.current.navigate('Home');
      });
      break;

    case 'lostFound':
      navigateWhenReady(navigationRef, () => {
        navigationRef.current.navigate('Home', { screen: 'LostFound' });
      });
      break;

    case 'event':
      navigateWhenReady(navigationRef, () => {
        navigationRef.current.navigate('Home', { screen: 'Events' });
      });
      break;

    case 'sport':
      navigateWhenReady(navigationRef, () => {
        navigationRef.current.navigate('Home', { screen: 'Sports' });
      });
      break;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {React.RefObject|null} navigationRef
 *   Pass null when the user is not authenticated (e.g. guest mode) to skip
 *   token registration and notification routing.
 */
export function usePushNotifications(navigationRef) {
  const notificationListener = useRef(null);
  const responseListener     = useRef(null);

  // ── Token registration ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigationRef) return; // Not authenticated — skip registration

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        API.put('/users/push-token', { token }).catch((err) =>
          console.warn('[Push] Failed to save token to server:', err.message)
        );
      }
    });
  }, [navigationRef]);

  // ── Killed-state: check last notification ONCE on mount ───────────────────
  useEffect(() => {
    if (!navigationRef) return;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        // The navigator may not be ready yet — routeNotification polls internally
        routeNotification(
          response.notification.request.content.data,
          navigationRef
        );
      })
      .catch(() => {
        // Swallow errors — this path must never surface to the user
      });
  }, [navigationRef]);

  // ── Foreground: log received notification (extend as needed) ───────────────
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Extend here to update badge counts, in-app banners, etc.
        console.log(
          '[Push] Notification received in foreground:',
          notification.request.identifier
        );
      }
    );

    return () => notificationListener.current?.remove();
  }, []);

  // ── Background + foreground tap: route to correct screen ──────────────────
  useEffect(() => {
    if (!navigationRef) return;

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        routeNotification(
          response.notification.request.content.data,
          navigationRef
        );
      }
    );

    return () => responseListener.current?.remove();
  }, [navigationRef]);
}

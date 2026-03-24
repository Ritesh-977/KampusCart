import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import API from '../api/axios';

// Show notification banner even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('[Push] Push notifications require a physical device');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4f46e5',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Notification permission denied');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Expo push token:', token);
    return token;
  } catch (e) {
    console.warn('[Push] Failed to get push token:', e.message);
    return null;
  }
}

export function usePushNotifications(navigationRef) {
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    // Register and save token to server
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        API.put('/users/push-token', { token }).catch((e) =>
          console.warn('[Push] Failed to save token to server:', e.message)
        );
      }
    });

    // Notification received while app is open (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Push] Notification received in foreground:', notification.request.identifier);
      }
    );

    // User tapped a notification (background or killed state)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (!data?.chatId || !navigationRef?.current) return;

        // Navigate to the chat screen
        navigationRef.current.navigate('ChatTab', {
          screen: 'ChatRoom',
          params: {
            chat: { _id: data.chatId, users: [] },
            otherUser: {
              _id: data.senderId,
              name: data.senderName,
              profilePic: data.senderPic || '',
            },
          },
        });
      }
    );

    return () => {
      // ── THIS IS THE FIX ──
      // Modern Expo approach: call .remove() directly on the subscription object
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      // ─────────────────────
    };
  }, []);
}
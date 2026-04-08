/**
 * pushSubscription.js — Web Push (VAPID) registration helpers
 *
 * Uses the authenticated axios instance so the JWT cookie is sent
 * automatically, matching the `protect` middleware on /api/users/subscribe.
 *
 * Call subscribeUserToPush() right after login / on the Settings page.
 * Call unsubscribeFromPush()  right before / after logout.
 */

import API from '../api/axios';

// Convert the VAPID public key from base64url to a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Request push permission, register the service worker, subscribe with VAPID,
 * and persist the subscription to the backend via PUT /api/users/subscribe.
 *
 * Safe to call multiple times — the server uses $pull + $push to deduplicate.
 */
export const subscribeUserToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Web Push is not supported in this browser.');
    return null;
  }

  try {
    // 1. Register (or reuse) the service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready; // Wait until SW is active

    // 2. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied.');
      return null;
    }

    // 3. Subscribe with VAPID public key
    const publicVapidKey    = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: convertedVapidKey,
    });

    // 4. Send the subscription object to the backend (authenticated)
    await API.post('/users/subscribe', { subscription });

    // 5. Persist the endpoint locally for logout cleanup
    localStorage.setItem('webPushEndpoint', subscription.endpoint);

    console.log('[Push] Web push subscription registered.');
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription error:', error);
    return null;
  }
};

/**
 * Unsubscribe from the browser's push manager and remove the subscription
 * from the backend. Call this on logout.
 */
export const unsubscribeFromPush = async () => {
  try {
    const endpoint = localStorage.getItem('webPushEndpoint');
    if (endpoint) {
      await API.delete('/users/subscribe', { data: { endpoint } });
      localStorage.removeItem('webPushEndpoint');
    }

    // Also unsubscribe at the browser level
    const registration  = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription  = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    console.log('[Push] Web push subscription removed.');
  } catch (error) {
    console.warn('[Push] Unsubscribe error:', error);
  }
};

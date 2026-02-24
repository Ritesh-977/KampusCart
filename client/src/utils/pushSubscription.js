// A standard helper function required by the Web Push API to format your public key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeUserToPush = async (userId) => {
  // 1. Check if the browser actually supports Service Workers and Push
  if ("serviceWorker" in navigator && "PushManager" in window) {
    try {
      // 2. Register the service worker file we created in the public folder
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered successfully");

      // 3. Ask the user for permission to send notifications
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Push notification permission denied.");
        return;
      }

      // 4. Generate the subscription object using your VAPID public key
      // Use VITE_ or REACT_APP_ depending on your build tool
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required for security
        applicationServerKey: convertedVapidKey,
      });

      // 5. Send the subscription to your backend route
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/users/subscribe`, {
        method: "POST",
        body: JSON.stringify({
          userId: userId,
          subscription: subscription,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("User successfully subscribed to push notifications!");
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      console.error("Detailed Push Error:", error.message, error);
    }
  } else {
    console.warn("Push messaging is not supported in this browser.");
  }
};

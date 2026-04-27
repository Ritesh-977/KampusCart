self.addEventListener('push', function (event) {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body,
        icon: data.icon,
        image: data.image,
        vibrate: [200, 100, 200],
        data: { url: data.url },
        actions: [
            { action: 'open_url', title: 'View Item' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 👇 This ensures that clicking ANYWHERE on the notification opens the item!
self.addEventListener('notificationclick', function (event) {
    event.notification.close(); // Close the popup

    // Open the browser to the exact item page
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
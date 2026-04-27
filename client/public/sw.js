self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body,
            icon: data.icon,   // The small logo
            image: data.image, // The large hero image of the item
            vibrate: [200, 100, 200], // Makes phones vibrate!
            data: {
                url: data.url  // Hidden data so the click event knows where to go
            },
            // Adds native clickable buttons to the bottom
            actions: [
                { action: 'open_url', title: 'View Item' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// 👇 This ensures that clicking ANYWHERE on the notification opens the item!
self.addEventListener('notificationclick', function (event) {
    event.notification.close(); // Close the popup

    // Open the browser to the exact item page
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
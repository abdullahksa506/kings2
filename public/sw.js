self.addEventListener('install', function () {
    self.skipWaiting()
})

self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim())
})

self.addEventListener('push', function (event) {
    if (!event.data) return

    const data = event.data.json()
    const options = {
        body: data.body,
        icon: data.icon || '/icon.svg',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '2',
            url: data.url || '/'
        },
        ...data.options
    }

    event.waitUntil((async () => {
        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
        allClients.forEach((client) => {
            client.postMessage({
                type: 'PUSH_RECEIVED',
                payload: data
            })
        })

        await self.registration.showNotification(data.title, options)
    })())
})

self.addEventListener('notificationclick', function (event) {
    console.log('Notification click received.')
    event.notification.close()
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(clients.openWindow(event.notification.data.url))
    } else {
        event.waitUntil(clients.openWindow('/'))
    }
})

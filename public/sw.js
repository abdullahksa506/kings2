/* eslint-disable no-restricted-globals */
self.addEventListener('install', function () {
    self.skipWaiting()
})

self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim())
})

// Vibration patterns per notification type
const VIBRATION_PATTERNS = {
    'king-decision':       [200, 80, 200, 80, 400],
    'attendance-pending':  [120, 60, 120],
    'attendance-complete': [80, 40, 80],
    'rating-unlocked':     [60, 30, 60, 30, 60],
    'voting':              [100, 50, 100],
    'outing-today':        [300, 100, 300],
    'restaurant-change':   [120, 60, 120, 60, 120],
    'day-change':          [200, 80, 200, 80, 200],
    'default':             [100, 50, 100],
}

// Action buttons per notification type (Android/desktop only; iOS ignores).
const ACTIONS_MAP = {
    'attendance-pending': [
        { action: 'attend', title: 'حضور' },
        { action: 'absent', title: 'اعتذار' },
    ],
    'rating-unlocked': [
        { action: 'rate', title: 'قيّم الآن' },
    ],
    'king-decision': [
        { action: 'open-king', title: 'افتح وقرر' },
    ],
    'outing-today': [
        { action: 'open-week', title: 'فتح الطلعة' },
    ],
}

// URL routes opened when an action is clicked.
const ACTION_URLS = {
    'attend':    '/?action=attend',
    'absent':    '/?action=absent',
    'rate':      '/?action=rate',
    'open-king': '/?action=king-decisions',
    'open-week': '/?tab=week',
}

self.addEventListener('push', function (event) {
    if (!event.data) return

    let data = {}
    try {
        data = event.data.json()
    } catch (_) {
        try {
            data = { title: 'تنبيه', body: event.data.text() }
        } catch (_) {
            return
        }
    }

    const type = data.type || 'default'
    const tag = data.tag || ('king-' + type)
    const vibrate = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.default
    const icon = data.icon || '/icon.svg'
    const actions = ACTIONS_MAP[type] || []

    const options = {
        body: data.body,
        icon: icon,
        badge: '/icon.svg',
        vibrate: vibrate,
        tag: tag,
        renotify: true,
        requireInteraction: false,
        actions: actions,
        data: {
            type: type,
            tag: tag,
            url: data.url || '/',
            payload: data.payload || null,
            arrivedAt: Date.now(),
        },
        ...data.options,
    }

    if (data.image) {
        options.image = data.image
    }

    event.waitUntil((async () => {
        // Notify all open tabs (used for in-app sound + toast)
        try {
            const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
            allClients.forEach(function (client) {
                client.postMessage({ type: 'PUSH_RECEIVED', payload: data })
            })
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('king_push_channel')
                channel.postMessage({ type: 'PUSH_RECEIVED', payload: data })
                channel.close()
            }
        } catch (_) {
            // ignore broadcast failures
        }

        // Set app badge (iOS 16.4+ / Android / supported desktops)
        try {
            if (self.navigator && typeof self.navigator.setAppBadge === 'function') {
                self.navigator.setAppBadge(1).catch(function () {})
            }
        } catch (_) {
            // ignore
        }

        await self.registration.showNotification(data.title || 'عرش الخميس', options)
    })())
})

self.addEventListener('notificationclick', function (event) {
    const notification = event.notification
    notification.close()

    const baseData = notification.data || {}
    const action = event.action || ''

    let targetUrl = baseData.url || '/'
    if (action && ACTION_URLS[action]) {
        targetUrl = ACTION_URLS[action]
    }

    event.waitUntil((async () => {
        try {
            if (self.navigator && typeof self.navigator.clearAppBadge === 'function') {
                self.navigator.clearAppBadge().catch(function () {})
            }
        } catch (_) {
            // ignore
        }

        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })

        // If a tab is already open, focus and message it.
        for (const client of allClients) {
            if ('focus' in client) {
                client.postMessage({
                    type: 'NOTIFICATION_ACTION',
                    action: action,
                    targetUrl: targetUrl,
                    payload: baseData.payload || null,
                })
                return client.focus()
            }
        }

        return clients.openWindow(targetUrl)
    })())
})

self.addEventListener('notificationclose', function () {
    try {
        if (self.navigator && typeof self.navigator.clearAppBadge === 'function') {
            self.navigator.clearAppBadge().catch(function () {})
        }
    } catch (_) {
        // ignore
    }
})

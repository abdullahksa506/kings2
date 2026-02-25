'use client'

import { useState, useEffect } from 'react'

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [isSubscribed, setIsSubscribed] = useState(false)

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            registerServiceWorker()
        }
    }, [])

    const registerServiceWorker = async () => {
        try {
            await navigator.serviceWorker.register('/sw.js')
            const registration = await navigator.serviceWorker.ready
            const extSubscription = await registration.pushManager.getSubscription()
            if (extSubscription) {
                setSubscription(extSubscription)
                setIsSubscribed(true)
            }
        } catch (error) {
            console.error('Service worker registration failed:', error)
        }
    }

    const subscribeToPush = async () => {
        if (!isSupported) return null
        try {
            const registration = await navigator.serviceWorker.ready
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) {
                console.error('VAPID Key not found')
                return null
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            })

            setSubscription(sub)
            setIsSubscribed(true)
            return sub
        } catch (error) {
            console.error('Push subscription error:', error)
            return null
        }
    }

    return { isSupported, isSubscribed, subscription, subscribeToPush }
}

'use client'

import { useState, useEffect, useCallback } from 'react'

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

    // Refresh subscription status
    const refreshSubscription = useCallback(async (registration: ServiceWorkerRegistration) => {
        try {
            const existingSub = await registration.pushManager.getSubscription()
            if (existingSub) {
                console.log('✅ Found active subscription')
                setSubscription(existingSub)
                setIsSubscribed(true)
                return true
            } else {
                console.log('❌ No subscription found')
                setSubscription(null)
                setIsSubscribed(false)
                return false
            }
        } catch (error) {
            console.error('Failed to get subscription:', error)
            return false
        }
    }, [])

    const registerServiceWorker = useCallback(async () => {
        try {
            console.log('📝 Registering Service Worker...')
            await navigator.serviceWorker.register('/sw.js')
            const registration = await navigator.serviceWorker.ready
            console.log('✅ Service Worker ready')
            await refreshSubscription(registration)
        } catch (error) {
            console.error('Service worker registration failed:', error)
        }
    }, [refreshSubscription])

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            registerServiceWorker()
        }
    }, [registerServiceWorker])

    const subscribeToPush = async () => {
        if (!isSupported) return null
        try {
            console.log('🔔 Requesting notification permission...')
            const permission = await Notification.requestPermission()
            console.log(`Permission: ${permission}`)
            
            if (permission !== 'granted') {
                console.error('❌ Notification permission not granted')
                return null
            }

            console.log('✅ Permission granted, subscribing to push...')
            const registration = await navigator.serviceWorker.ready
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) {
                console.error('❌ VAPID Key not found')
                return null
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            })

            console.log('✅ Subscribed successfully!')
            // Update state immediately
            setSubscription(sub)
            setIsSubscribed(true)
            
            // Also verify subscription persists
            const verifySubscription = await registration.pushManager.getSubscription()
            if (verifySubscription) {
                console.log('✅ Subscription verified and persisted')
            } else {
                console.warn('⚠️ Subscription not persisted!')
            }
            
            return sub
        } catch (error) {
            console.error('Push subscription error:', error)
            return null
        }
    }

    return { isSupported, isSubscribed, subscription, subscribeToPush, refreshSubscription }
}

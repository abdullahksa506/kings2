'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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
    const audioContextRef = useRef<AudioContext | null>(null)
    const audioBufferRef = useRef<AudioBuffer | null>(null)

    const resolveNotificationSoundUrl = useCallback((soundUrl?: string) => {
        const fallback = '/notification-voice.mp3'
        const preferred = typeof window !== 'undefined'
            ? localStorage.getItem('king_notification_sound_url') || ''
            : ''
        return soundUrl || preferred || fallback
    }, [])

    const unlockNotificationSound = useCallback(async (soundUrl?: string) => {
        if (typeof window === 'undefined') return false
        const finalSound = resolveNotificationSoundUrl(soundUrl)

        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
            if (!AudioCtx) return false

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioCtx()
            }

            if (audioContextRef.current.state !== 'running') {
                await audioContextRef.current.resume()
            }

            if (!audioBufferRef.current) {
                const res = await fetch(finalSound)
                const arr = await res.arrayBuffer()
                audioBufferRef.current = await audioContextRef.current.decodeAudioData(arr)
            }

            localStorage.setItem('king_notification_sound_unlocked', '1')
            return true
        } catch (error) {
            console.warn('Failed to unlock notification sound:', error)
            return false
        }
    }, [resolveNotificationSoundUrl])

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
            const registration = await navigator.serviceWorker.register('/sw.js')
            await registration.update()
            const readyRegistration = await navigator.serviceWorker.ready
            console.log('✅ Service Worker ready')
            await refreshSubscription(readyRegistration)
        } catch (error) {
            console.error('Service worker registration failed:', error)
        }
    }, [refreshSubscription])

    const playNotificationSound = useCallback(async (soundUrl?: string) => {
        const finalSound = resolveNotificationSoundUrl(soundUrl)

        try {
            if (audioContextRef.current?.state === 'running' && audioBufferRef.current) {
                const source = audioContextRef.current.createBufferSource()
                source.buffer = audioBufferRef.current
                source.connect(audioContextRef.current.destination)
                source.start(0)
                return true
            }
        } catch (error) {
            console.warn('WebAudio playback failed, fallback to HTMLAudio:', error)
        }

        try {
            const audio = new Audio(finalSound)
            await audio.play()
            return true
        } catch (error) {
            console.warn('Notification sound playback blocked or failed:', error)
            return false
        }
    }, [resolveNotificationSoundUrl])

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            registerServiceWorker()
        }
    }, [registerServiceWorker])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const unlocked = localStorage.getItem('king_notification_sound_unlocked') === '1'
        if (!unlocked) return
        unlockNotificationSound().catch(() => {
            // Some browsers require a new user gesture after reload.
        })
    }, [unlockNotificationSound])

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        const onServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data?.type !== 'PUSH_RECEIVED') return
            const incomingSound = event.data?.payload?.soundUrl || event.data?.payload?.options?.soundUrl
            playNotificationSound(incomingSound)
        }

        navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
        return () => {
            navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage)
        }
    }, [playNotificationSound])

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

    return {
        isSupported,
        isSubscribed,
        subscription,
        subscribeToPush,
        refreshSubscription,
        playNotificationSound,
        unlockNotificationSound,
    }
}

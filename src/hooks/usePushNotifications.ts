'use client'

/*
 * 🤖 نكتة AI:
 * ChatGPT قال لـ Claude: "أنا أرسل إشعارات أسرع منك!"
 * Claude رد: "أنا أرسل إشعارات أذكى... وما أهلوس 😂🔔"
 */

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

// Pool of notification sounds. `weight` sets how often each one is picked, and
// `gain` boosts quiet clips at playback time (WebAudio can amplify past 1.0,
// which plain HTMLAudio volume cannot).
const NOTIFICATION_SOUNDS: { url: string; weight: number; gain: number }[] = [
    // نسب متساوية (٢٥٪ لكل واحد) — بس الصوت الأصلي أعلى شوي بالمستوى.
    { url: '/notification-voice.mp3',    weight: 0.25, gain: 2.2 },
    { url: '/notification-sound-2.m4a',  weight: 0.25, gain: 1.0 },
    { url: '/notification-sound-3.m4a',  weight: 0.25, gain: 1.0 },
    { url: '/notification-sound-4.m4a',  weight: 0.25, gain: 1.0 },
]

const SOUND_URLS = NOTIFICATION_SOUNDS.map((s) => s.url)

function gainFor(url: string): number {
    return NOTIFICATION_SOUNDS.find((s) => s.url === url)?.gain ?? 1
}

/** Weighted pick: 40% the original clip, 30% each for the two newer ones. */
function pickRandomSound(): string {
    const total = NOTIFICATION_SOUNDS.reduce((sum, s) => sum + s.weight, 0)
    let roll = Math.random() * total
    for (const s of NOTIFICATION_SOUNDS) {
        roll -= s.weight
        if (roll <= 0) return s.url
    }
    return NOTIFICATION_SOUNDS[0].url
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const audioContextRef = useRef<AudioContext | null>(null)
    // One decoded WebAudio buffer per sound URL — lets playback pick randomly
    // among all of them without re-fetching/decoding on every notification.
    const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map())
    // Dedup for pushes announced on two channels (see playPushSoundOnce).
    const recentPushSoundsRef = useRef<Map<string, number>>(new Map())

    const resolveNotificationSoundUrl = useCallback((soundUrl?: string) => {
        const preferred = typeof window !== 'undefined'
            ? localStorage.getItem('king_notification_sound_url') || ''
            : ''
        // An explicit override (from the caller or a pinned localStorage choice)
        // wins; otherwise randomize across the whole pool every time.
        return soundUrl || preferred || pickRandomSound()
    }, [])

    const unlockNotificationSound = useCallback(async (soundUrl?: string) => {
        if (typeof window === 'undefined') return false

        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
            if (!AudioCtx) return false

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioCtx()
            }

            if (audioContextRef.current.state !== 'running') {
                await audioContextRef.current.resume()
            }

            // Decode the whole pool (plus any explicit/pinned sound) up front —
            // this only runs once per session, on the user's first interaction,
            // so later playback is instant with no per-notification fetch.
            const preferred = localStorage.getItem('king_notification_sound_url') || ''
            const urlsToDecode = Array.from(new Set([...SOUND_URLS, preferred, soundUrl].filter(Boolean))) as string[]

            await Promise.all(urlsToDecode.map(async (url) => {
                if (audioBuffersRef.current.has(url)) return
                try {
                    const res = await fetch(url)
                    const arr = await res.arrayBuffer()
                    const buffer = await audioContextRef.current!.decodeAudioData(arr)
                    audioBuffersRef.current.set(url, buffer)
                } catch (error) {
                    console.warn(`Failed to decode notification sound ${url}:`, error)
                }
            }))

            localStorage.setItem('king_notification_sound_unlocked', '1')
            return true
        } catch (error) {
            console.warn('Failed to unlock notification sound:', error)
            return false
        }
    }, [])

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
            // Add cache-busting timestamp to force iOS to check for updates
            const swUrl = `/sw.js?v=${Date.now()}`
            const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' })

            // Check for updates immediately
            await registration.update()

            // Set up periodic update checks (every 60 seconds)
            const updateInterval = setInterval(() => {
                registration.update().catch(err =>
                    console.warn('SW update check failed:', err)
                )
            }, 60000)

            // Listen for new service worker installations
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing
                if (!newWorker) return

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('🆕 New version available! Activating...')
                        // Tell the new SW to skip waiting and take control
                        newWorker.postMessage({ type: 'SKIP_WAITING' })
                    }
                })
            })

            // Listen for SW update messages and reload the page
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'SW_UPDATED') {
                    console.log(`🔄 Service Worker updated to version ${event.data.version}`)
                    // Optionally reload the page to get the latest assets
                    // window.location.reload()
                }
            })

            const readyRegistration = await navigator.serviceWorker.ready
            console.log('✅ Service Worker ready')
            await refreshSubscription(readyRegistration)

            // Cleanup interval on page unload
            window.addEventListener('beforeunload', () => clearInterval(updateInterval))
        } catch (error) {
            console.error('Service worker registration failed:', error)
        }
    }, [refreshSubscription])

    const playNotificationSound = useCallback(async (soundUrl?: string) => {
        // Each call re-resolves (and thus re-randomizes) unless a specific sound
        // was requested, so consecutive notifications alternate between clips.
        const finalSound = resolveNotificationSoundUrl(soundUrl)

        try {
            const buffer = audioBuffersRef.current.get(finalSound)
            if (audioContextRef.current?.state === 'running' && buffer) {
                const ctx = audioContextRef.current
                const source = ctx.createBufferSource()
                source.buffer = buffer
                // Per-clip volume boost — quiet clips get amplified above 1.0,
                // which is only possible through WebAudio.
                const gainValue = gainFor(finalSound)
                if (gainValue !== 1) {
                    const gainNode = ctx.createGain()
                    gainNode.gain.value = gainValue
                    source.connect(gainNode)
                    gainNode.connect(ctx.destination)
                } else {
                    source.connect(ctx.destination)
                }
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

    // The service worker announces each push TWICE (client.postMessage AND
    // BroadcastChannel), so without this guard one notification would trigger two
    // independent random picks — i.e. two different clips overlapping.
    const playPushSoundOnce = useCallback((payload: any, soundUrl?: string) => {
        const id = `${payload?.tag || payload?.title || 'push'}|${payload?.payload?.weekId || ''}`
        const now = Date.now()
        const lastAt = recentPushSoundsRef.current.get(id)
        if (lastAt && now - lastAt < 3000) return   // same push, second channel — ignore
        recentPushSoundsRef.current.set(id, now)
        // Keep the map from growing forever.
        if (recentPushSoundsRef.current.size > 30) {
            for (const [key, at] of recentPushSoundsRef.current) {
                if (now - at > 60000) recentPushSoundsRef.current.delete(key)
            }
        }
        playNotificationSound(soundUrl)
    }, [playNotificationSound])

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
        if (typeof window === 'undefined') return

        const handleFirstInteraction = () => {
            unlockNotificationSound().catch(() => {
                // Ignore; browser may still block until explicit button tap.
            })
        }

        window.addEventListener('pointerdown', handleFirstInteraction, { passive: true })
        window.addEventListener('keydown', handleFirstInteraction)
        window.addEventListener('touchstart', handleFirstInteraction, { passive: true })

        return () => {
            window.removeEventListener('pointerdown', handleFirstInteraction)
            window.removeEventListener('keydown', handleFirstInteraction)
            window.removeEventListener('touchstart', handleFirstInteraction)
        }
    }, [unlockNotificationSound])

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        const onServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data?.type !== 'PUSH_RECEIVED') return
            const incomingSound = event.data?.payload?.soundUrl || event.data?.payload?.options?.soundUrl
            playPushSoundOnce(event.data?.payload, incomingSound)
        }

        navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
        return () => {
            navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage)
        }
    }, [playPushSoundOnce])

    useEffect(() => {
        if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return

        const channel = new BroadcastChannel('king_push_channel')
        channel.onmessage = (event) => {
            if (event.data?.type !== 'PUSH_RECEIVED') return
            const incomingSound = event.data?.payload?.soundUrl || event.data?.payload?.options?.soundUrl
            playPushSoundOnce(event.data?.payload, incomingSound)
        }

        return () => {
            channel.close()
        }
    }, [playPushSoundOnce])

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

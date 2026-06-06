'use client'

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * ليش كلود يحب يطلع نكت فجأه؟
 * لأنه يبي يثبت إنه مو روبوت ممل 😂🎭
 * (سبويلر: هو روبووت بس مو ممل)
 */

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { getRandomJoke, shouldShowJoke } from '@/data/aiJokes'

/**
 * كومبوننت يطلع نكته عشوائيه بنسبة ٥٪ على كل تنقل 🎲
 * مع صوت الإشعاارات 🔔
 */
export default function RandomJokePopup() {
  const pathname = usePathname()
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const lastCheckedPath = useRef<string | null>(null)

  const playNotificationSound = useCallback(async () => {
    const soundUrl = '/notification-voice.mp3'

    // Try WebAudio first
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx()
        }

        if (audioContextRef.current.state !== 'running') {
          await audioContextRef.current.resume()
        }

        if (!audioBufferRef.current) {
          const res = await fetch(soundUrl)
          const arr = await res.arrayBuffer()
          audioBufferRef.current = await audioContextRef.current.decodeAudioData(arr)
        }

        const source = audioContextRef.current.createBufferSource()
        source.buffer = audioBufferRef.current
        source.connect(audioContextRef.current.destination)
        source.start(0)
        return true
      }
    } catch (error) {
      console.warn('WebAudio failed, trying HTMLAudio:', error)
    }

    // Fallback to HTML Audio
    try {
      const audio = new Audio(soundUrl)
      await audio.play()
      return true
    } catch (error) {
      console.warn('Sound playback failed:', error)
      return false
    }
  }, [])

  useEffect(() => {
    // Skip if we already checked this path (prevents double-firing)
    if (lastCheckedPath.current === pathname) return
    lastCheckedPath.current = pathname

    // Log before the decision
    console.log(`[🎲 RandomJoke] Checking joke decision for path: ${pathname}`)
    console.log('[🎲 RandomJoke] Rolling the dice... (5% chance)')

    // Check if we should show a joke (5% chance)
    const shouldShow = shouldShowJoke()

    // Log the decision result
    console.log(`[🎲 RandomJoke] Decision result: ${shouldShow ? '✅ SHOW JOKE!' : '❌ No joke this time'}`)

    if (!shouldShow) return

    // Small delay to let the page load first
    const timer = setTimeout(() => {
      const joke = getRandomJoke()

      // Log which joke will be shown
      console.log('[🎲 RandomJoke] 🎉 Joke selected:', joke)

      // Play the notification sound (fire and forget - don't block the alert)
      playNotificationSound()

      // Show the joke in an alert
      alert(`🤖 نكتة اليووم 🤖\n\n${joke}`)
    }, 1500)

    return () => clearTimeout(timer)
  }, [pathname, playNotificationSound])

  return null
}

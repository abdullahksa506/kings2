'use client'

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * ليش كلود يراقب كل كليك؟
 * لأنه يبي يتأكد إنك مو روبوت... بينما هو الروبوت 😂🤖👆
 * (كل ضغطه = فرصة ٣٪ للنكته)
 */

import { useEffect, useRef, useCallback } from 'react'
import { getRandomJoke, shouldShowJoke } from '@/data/aiJokes'

/**
 * كومبوننت يطلع نكته عشوائيه بنسبة ٣٪ على كل كللليك 🎲👆
 * مع صوت الإشعاارات 🔔
 */
export default function RandomJokePopup() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const isShowingJokeRef = useRef(false) // Prevent double-firing during alert

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

  const handleClick = useCallback(() => {
    // Prevent triggering while already showing a joke
    if (isShowingJokeRef.current) return

    // Log before the decision
    console.log('[🎲 RandomJoke] Click detected! Rolling the dice... (3% chance)')

    // Check if we should show a joke (3% chance)
    const shouldShow = shouldShowJoke()

    // Log the decision result  
    const resultMsg = shouldShow ? '✅ SHOW JOKE!' : '❌ No joke this time'
    console.log('[🎲 RandomJoke] Decision result: ' + resultMsg)

    if (!shouldShow) return

    // Set flag to prevent double-firing
    isShowingJokeRef.current = true

    // Small delay to let any UI interactions complete first
    setTimeout(() => {
      const joke = getRandomJoke()

      // Log which joke will be shown
      console.log('[🎲 RandomJoke] 🎉 Joke selected:', joke)

      // Play the notification sound (fire and forget - don't block the alert)
      playNotificationSound()

      // Show the joke in an alert
      alert('🤖 نكتة اليووم 🤖\n\n' + joke)

      // Reset flag after alert is dismissed
      isShowingJokeRef.current = false
    }, 100)
  }, [playNotificationSound])

  useEffect(() => {
    // Add global click listener to document
    document.addEventListener('click', handleClick, true) // capture phase to catch ALL clicks

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [handleClick])

  return null
}

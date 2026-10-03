/*
 * 🤖 الروبوت قال: التاج PNG، لا تسجله SVG وإلا الجوال يحتار 😂
 */
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ملك الخميس | King of Thursday',
        short_name: 'ملك الخميس',
        description: 'The Official King of Thursday Management App 2026',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b101b',
        theme_color: '#f59e0b',
        icons: [
            {
                src: '/icons/royal-v2-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/royal-v2-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    }
}

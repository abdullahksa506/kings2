/*
 * 🤖 الروبوت قال: التاج PNG، لا تسجله SVG وإلا الجوال يحتار 😂
 */
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'عرش الخميس',
        short_name: 'عرش الخميس',
        description: 'عرش الخميس — تنظيم الطلعات وتقييم المطاعم للأعضاء',
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

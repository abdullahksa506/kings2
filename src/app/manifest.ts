import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ملك الخميس | King of Thursday',
        short_name: 'ملك الخميس',
        description: 'The Official King of Thursday Management App 2026',
        start_url: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#f59e0b',
        icons: [
            {
                src: '/icon',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    }
}

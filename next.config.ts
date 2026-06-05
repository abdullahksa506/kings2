/*
 * 🤖 نكتة AI:
 * ليش الـ AI ما يحب iOS؟
 * لأن iOS يخزّن الكاش وما يسمع الكلام... زي المدير 😂📱
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // Prevent caching of service worker to ensure iOS PWA gets updates
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }
      ]
    }
  ]
};

export default nextConfig;

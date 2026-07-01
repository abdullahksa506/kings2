import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./theme-overrides.css";
import { AuthProvider } from "@/context/AuthContext";
import RandomJokePopup from "@/components/RandomJokePopup";
import { Toaster } from "sonner";
import { Viewport } from "next";

const inter = Inter({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: "ملك الخميس | King of Thursday",
  description: "The Official King of Thursday Management App 2026",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ملك الخميس",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  viewportFit: "cover",
};

// Inline script that runs BEFORE React hydrates.
// Reads king_theme from localStorage and applies data-theme + bg-color to
// <html> so the user never sees the old theme flash before the new one.
// Must run synchronously in the <head> before <body> paints.
const themeBootScript = `
(function(){
  try {
    var t = localStorage.getItem('king_theme');
    if (!t) return;
    document.documentElement.setAttribute('data-theme', t);
    var bgs = {
      'tiktok': '#000000',
      'brutalist': '#1c1917',
      'terminal': '#0a0e0a',
      'luxe-gold': '#0a0a0a',
      'comic-pop': '#bae6fd',
      'aurora': '#1e1b4b',
      'bento': '#020617',
      'neon-cyber': '#0a0118'
    };
    var colors = {
      'royal-amber':'#f59e0b','ocean-cyan':'#06b6d4','emerald-night':'#10b981',
      'sunset-fire':'#f97316','rose-neon':'#f43f5e','arctic-ice':'#60a5fa',
      'forest-olive':'#84cc16','midnight-indigo':'#6366f1','neon-cyber':'#d946ef',
      'brutalist':'#facc15','terminal':'#22c55e','luxe-gold':'#fbbf24',
      'comic-pop':'#ec4899','aurora':'#a78bfa','bento':'#f59e0b','tiktok':'#000000'
    };
    var bg = bgs[t];
    if (bg) {
      document.documentElement.style.backgroundColor = bg;
      // body might not exist yet — set when ready
      var setBodyBg = function(){ if (document.body) document.body.style.backgroundColor = bg; };
      setBodyBg();
      if (!document.body) document.addEventListener('DOMContentLoaded', setBodyBg);
    }
    var c = colors[t];
    if (c) {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', c);
    }
  } catch(e) {}
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body suppressHydrationWarning className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen selection:bg-amber-500/30 pb-safe pt-safe pl-safe pr-safe`}>
        <RandomJokePopup />
        <Toaster position="top-center" theme="dark" />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

import { Viewport } from "next";

export const metadata: Metadata = {
  title: "ملك الخميس | King of Thursday",
  description: "The Official King of Thursday Management App 2026",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ملك الخميس",
  },
  icons: {
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b", // Amber 500
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen selection:bg-amber-500/30 pb-safe pt-safe pl-safe pr-safe`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

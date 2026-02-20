import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ملك الخميس | King of Thursday",
  description: "The Official King of Thursday Management App 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen selection:bg-amber-500/30`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

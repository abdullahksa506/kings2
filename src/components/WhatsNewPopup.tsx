"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

/**
 * What's New popup — surfaces the biggest recent features to every member
 * up to MAX_SHOWS times per VERSION. Bump the VERSION string when adding
 * new features and the counter resets automatically.
 */
const VERSION = "2026-06-14-v2";
const MAX_SHOWS = 4;

interface Feature {
    icon: string;
    title: string;
    desc: string;
    gradient: string;
}

const FEATURES: Feature[] = [
    {
        icon: "📱",
        title: "ثيم TikTok كامل",
        desc: "For You Page تفاعلي + ١٠٠ أغنية حقيقية + بطاقات لكل أقسام الموقع",
        gradient: "from-pink-500 to-rose-600",
    },
    {
        icon: "🍱",
        title: "ثيم بنتو التفاعلي",
        desc: "كل بطاقة تايل ملوّن — تنقرها تنقلب وتكشف تفاصيلها",
        gradient: "from-amber-500 to-orange-600",
    },
    {
        icon: "💻",
        title: "التيرمنال الحي",
        desc: "افتح /terminal وكوّد بـ١٦ أمر فعّال — تصويت، حضور، إحصائيات",
        gradient: "from-emerald-500 to-teal-600",
    },
    {
        icon: "🎲",
        title: "تنسيق ذاتي للطلعة العشوائية",
        desc: "ما فيه ملك؟ صوّتوا، يُحسم اليوم تلقائياً عند ٤+ أصوات",
        gradient: "from-fuchsia-500 to-purple-600",
    },
    {
        icon: "🤖",
        title: "المخطّط الذكي للطلعات",
        desc: "ذكاء اصطناعي يقترح أحسن مطعم من ١١ ألف مطعم بالرياض",
        gradient: "from-violet-500 to-indigo-600",
    },
    {
        icon: "🎨",
        title: "١٦ ثيم شخصي",
        desc: "كل عضو يختار ثيمه ويحتفظ فيه — TikTok، كوميك، أورورا، بنتو، ملكي ذهبي وأكثر",
        gradient: "from-cyan-500 to-blue-600",
    },
    {
        icon: "🚨",
        title: "أنا فاضي من الفيد",
        desc: "ابدأ لقاء مفاجئ مباشرة من ثيم TikTok — كل الجلسة تستلم إشعار",
        gradient: "from-red-500 to-pink-600",
    },
    {
        icon: "🗺️",
        title: "خريطة المطاعم التفاعلية",
        desc: "كل مطاعمنا على خريطة مباشرة — اضغط أي علامة للتفاصيل + اقتراحات قوقل",
        gradient: "from-green-500 to-emerald-600",
    },
    {
        icon: "⚡",
        title: "تسريع تحميل ٣٨%",
        desc: "الموقع أسرع بشكل ملحوظ — code-split + cache + boot script",
        gradient: "from-yellow-400 to-amber-500",
    },
];

interface WhatsNewPopupProps {
    userName: string;
}

export default function WhatsNewPopup({ userName }: WhatsNewPopupProps) {
    const [show, setShow] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (!userName) return;
        const key = `whats_new_${VERSION}_${userName}`;
        try {
            const count = parseInt(localStorage.getItem(key) || "0", 10);
            if (count < MAX_SHOWS) {
                // Delay so it doesn't fight with initial render
                const t = setTimeout(() => {
                    setShow(true);
                    setTimeout(() => setAnimateIn(true), 20);
                    localStorage.setItem(key, String(count + 1));
                }, 800);
                return () => clearTimeout(t);
            }
        } catch {
            /* localStorage unavailable */
        }
    }, [userName]);

    const close = () => {
        setAnimateIn(false);
        setTimeout(() => setShow(false), 300);
    };

    if (!show) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4"
            style={{ background: animateIn ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)", transition: "background 300ms" }}
            onClick={close}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-950 border border-white/15 shadow-2xl transition-all duration-300 ${
                    animateIn ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95"
                }`}
                dir="rtl"
            >
                {/* Top gradient header */}
                <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-pink-600 via-fuchsia-600 to-cyan-500 px-6 py-7 text-center text-white">
                    <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_50%)]" />
                    <button
                        onClick={close}
                        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center active:scale-90 transition-transform"
                        aria-label="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="relative">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 backdrop-blur mb-3">
                            <Sparkles className="w-7 h-7" />
                        </div>
                        <span className="inline-block bg-white text-fuchsia-700 font-black text-[10px] tracking-wider px-2.5 py-0.5 rounded-full mb-2 shadow">
                            🎉 إعلان تحديث
                        </span>
                        <h2 className="text-3xl font-black drop-shadow-lg">ملك الخميس <span className="text-cyan-200">v2</span></h2>
                        <p className="text-sm text-white/90 mt-1">أهم الميزات الجديدة في الموقع</p>
                    </div>
                </div>

                {/* Feature list */}
                <div className="p-4 space-y-2.5">
                    {FEATURES.map((f, i) => (
                        <div
                            key={f.title}
                            className="flex items-start gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 transition-colors"
                            style={{
                                animation: animateIn ? `tt-heart-pop 0ms` : "none",
                                opacity: animateIn ? 1 : 0,
                                transform: animateIn ? "translateY(0)" : "translateY(20px)",
                                transition: `opacity 400ms ${i * 60}ms, transform 400ms ${i * 60}ms`,
                            }}
                        >
                            <div
                                className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-2xl shadow-lg`}
                            >
                                {f.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-white text-sm">{f.title}</p>
                                <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Dismiss button */}
                <div className="p-4 pt-2 sticky bottom-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
                    <button
                        onClick={close}
                        className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 text-white font-black py-3 rounded-2xl text-base active:scale-95 transition-transform shadow-lg"
                    >
                        فهمت! خلني أجرّب 🚀
                    </button>
                    <p className="text-center text-[10px] text-slate-500 mt-2">
                        راح يطلع هذا الإعلان ٤ مرات كحد أقصى ثم يختفي
                    </p>
                </div>
            </div>
        </div>
    );
}

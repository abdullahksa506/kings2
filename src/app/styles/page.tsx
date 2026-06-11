"use client";

/*
 * صفحة معاينة أشكال التصميم — مو جزء من الموقع الفعلي، فقط للاستعراض.
 * زورها على /styles لتجربة 5 ستايلات مختلفة على نفس المحتوى.
 */

import { useState } from "react";
import { Crown, MapPin, Calendar, Star, Users, ChevronLeft } from "lucide-react";
import Link from "next/link";

type StyleKey =
    | "current" | "minimal" | "glass" | "editorial" | "pastel"
    | "neon" | "brutalist" | "terminal" | "luxe" | "comic" | "aurora";

const STYLES: { key: StyleKey; label: string; emoji: string; desc: string }[] = [
    { key: "current", label: "الحالي (ملكي)", emoji: "👑", desc: "ذهبي على غامق، زوايا ناعمة، تدرّجات — الشكل الحالي" },
    { key: "minimal", label: "بسيط ونظيف", emoji: "◻️", desc: "مساحة بيضاء، حدود رفيعة، صفر تدرّجات، خطوط واضحة" },
    { key: "glass", label: "زجاجي (Glass)", emoji: "🧊", desc: "بطاقات شفافة مع ضباب خلفي، إحساس فاخر وعصري" },
    { key: "editorial", label: "مجلّة (Editorial)", emoji: "📰", desc: "خطوط كبيرة وجريئة، تنسيق غير متماثل، كتل لونية" },
    { key: "pastel", label: "هادئ (Pastel)", emoji: "🌸", desc: "ألوان دافئة وودودة، إحساس مريح، أقل رسمية" },
    { key: "neon", label: "نيون سايبر", emoji: "⚡", desc: "أسود مع توهّج نيون بنفسجي وسماوي، إحساس مستقبلي حاد" },
    { key: "brutalist", label: "بروتالي خام", emoji: "🧱", desc: "حدود سوداء سميكة، ظلال صلبة، صفر زوايا ناعمة، جريء وصادم" },
    { key: "terminal", label: "تيرمنال هاكر", emoji: "💻", desc: "أخضر على أسود، خط مونوسبيس، إحساس كونسول وكود" },
    { key: "luxe", label: "فخامة ذهبية", emoji: "🥂", desc: "أسود وذهبي فاخر، خط كلاسيكي أنيق، إحساس راقٍ جداً" },
    { key: "comic", label: "كوميك مرح", emoji: "💥", desc: "حدود سميكة، ألوان بوب، ظلال كرتونية، مرح وجريء" },
    { key: "aurora", label: "أورورا", emoji: "🌌", desc: "تدرّجات حيّة وكرات متوهّجة، إحساس تطبيق عصري ناعم" },
];

export default function StylePreview() {
    const [active, setActive] = useState<StyleKey>("current");

    return (
        <div className={containerClass(active)} dir="rtl">
            {/* Top bar — لا يدخل في الستايل، ثابت */}
            <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-white">معاينة أشكال التصميم</h1>
                            <p className="text-[11px] text-slate-500">جرّب 11 ستايل قبل ما نغيّر الموقع</p>
                        </div>
                    </div>
                </div>

                {/* Style switcher chips */}
                <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
                    {STYLES.map((s) => (
                        <button
                            key={s.key}
                            onClick={() => setActive(s.key)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all whitespace-nowrap ${
                                active === s.key
                                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/30"
                                    : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500"
                            }`}
                        >
                            <span className="ml-1">{s.emoji}</span>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Style description */}
            <div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
                <p className="text-xs text-slate-500 bg-slate-900/40 border border-slate-800/50 rounded-lg px-3 py-2">
                    {STYLES.find((s) => s.key === active)?.desc}
                </p>
            </div>

            {/* The previewed content — يتغير شكله حسب الستايل المختار */}
            <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
                <WeekCard style={active} />
                <RestaurantCard style={active} />
                <LeaderboardCard style={active} />
            </div>

            {/* زر الاختيار — يسجّل تصويتك على الستايل */}
            {active !== "current" && (
                <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3">
                    <div className="max-w-4xl mx-auto">
                        <VotePanel styleKey={active} styleLabel={STYLES.find((s) => s.key === active)?.label || active} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// تسجيل اختيار الستايل (يحفظ في Firestore عبر invokeRpc الموجود)
// ============================================================================
function VotePanel({ styleKey, styleLabel }: { styleKey: string; styleLabel: string }) {
    const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

    const vote = async () => {
        setState("busy");
        try {
            const { invokeRpc } = await import("@/lib/services");
            await invokeRpc("voteStylePreference", { style: styleKey });
            setState("done");
        } catch {
            setState("error");
        }
    };

    if (state === "done") {
        return (
            <p className="text-center text-emerald-400 font-semibold py-2">
                ✅ تسجّل اختيارك «{styleLabel}» — بنطبّقه إذا وافق الأغلبية
            </p>
        );
    }

    return (
        <button
            onClick={vote}
            disabled={state === "busy"}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-400 hover:to-purple-400 disabled:opacity-50 text-white font-bold py-3 rounded-2xl shadow-lg shadow-fuchsia-500/30"
        >
            {state === "busy" ? "يسجّل..." : state === "error" ? "تعذّر — اضغط للمحاولة مرة ثانية" : `😍 أبي «${styleLabel}» — صوّت له`}
        </button>
    );
}

// ============================================================================
// الحاوية الخارجية (الخلفية تتغير حسب الستايل)
// ============================================================================
function containerClass(style: StyleKey) {
    return {
        current: "min-h-screen bg-slate-950 text-white pb-20",
        minimal: "min-h-screen bg-zinc-50 text-zinc-900 pb-20",
        glass: "min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white pb-20",
        editorial: "min-h-screen bg-amber-50 text-stone-900 pb-20",
        pastel: "min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50 text-stone-800 pb-20",
        neon: "min-h-screen bg-black text-white pb-20",
        brutalist: "min-h-screen bg-yellow-300 text-black pb-20",
        terminal: "min-h-screen bg-[#0a0e0a] text-green-400 pb-20 font-mono",
        luxe: "min-h-screen bg-neutral-950 text-amber-50 pb-20",
        comic: "min-h-screen bg-sky-200 text-black pb-20",
        aurora: "min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white pb-20",
    }[style];
}

// ============================================================================
// بطاقة الأسبوع — الملك، اليوم، المطعم
// ============================================================================
function WeekCard({ style }: { style: StyleKey }) {
    const king = "هشام";
    const day = "الخميس";
    const restaurant = "البيك";

    switch (style) {
        case "current":
            return (
                <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-400/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                    <div className="relative z-10 text-center space-y-3">
                        <p className="text-amber-400/80 text-xs font-semibold">ملك الخميس</p>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent flex items-center gap-2 justify-center">
                            <Crown className="w-7 h-7 text-amber-400" /> {king}
                        </h2>
                        <div className="flex justify-center gap-6 pt-2 text-sm">
                            <div className="flex items-center gap-1.5 text-amber-200/80">
                                <Calendar className="w-4 h-4" /> {day}
                            </div>
                            <div className="flex items-center gap-1.5 text-amber-200/80">
                                <MapPin className="w-4 h-4" /> {restaurant}
                            </div>
                        </div>
                    </div>
                </div>
            );

        case "minimal":
            return (
                <div className="bg-white border border-zinc-200 p-8">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">ملك الخميس</p>
                    <h2 className="text-4xl font-light text-zinc-900 mb-5">{king}</h2>
                    <div className="flex gap-8 text-sm text-zinc-600 border-t border-zinc-100 pt-4">
                        <div>
                            <div className="text-[10px] text-zinc-400">اليوم</div>
                            <div className="font-medium">{day}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-400">المطعم</div>
                            <div className="font-medium">{restaurant}</div>
                        </div>
                    </div>
                </div>
            );

        case "glass":
            return (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 backdrop-blur-lg p-3 rounded-xl">
                            <Crown className="w-6 h-6 text-amber-300" />
                        </div>
                        <div>
                            <p className="text-[11px] text-white/60">ملك الخميس</p>
                            <h2 className="text-2xl font-bold text-white">{king}</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-3">
                            <Calendar className="w-4 h-4 text-white/60 mb-1" />
                            <p className="text-[10px] text-white/50">اليوم</p>
                            <p className="font-semibold">{day}</p>
                        </div>
                        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-3">
                            <MapPin className="w-4 h-4 text-white/60 mb-1" />
                            <p className="text-[10px] text-white/50">المطعم</p>
                            <p className="font-semibold">{restaurant}</p>
                        </div>
                    </div>
                </div>
            );

        case "editorial":
            return (
                <div className="border-t-4 border-b-4 border-stone-900 py-6 bg-amber-50">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 mb-2">عدد هذا الأسبوع</p>
                    <h2 className="font-serif text-6xl text-stone-900 leading-none mb-4">{king}</h2>
                    <p className="text-stone-600 text-sm font-medium">يتسلّم تاج عرش الخميس</p>
                    <div className="flex gap-6 mt-5 pt-4 border-t border-stone-300 text-sm">
                        <span className="font-serif text-stone-900">
                            <span className="font-bold">{day}</span> · {restaurant}
                        </span>
                    </div>
                </div>
            );

        case "pastel":
            return (
                <div className="bg-white/70 backdrop-blur-sm border-2 border-rose-200/50 rounded-[2rem] p-6 shadow-md shadow-rose-200/30">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="bg-gradient-to-br from-rose-300 to-amber-300 w-12 h-12 rounded-full flex items-center justify-center">
                            <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[11px] text-rose-500/80">ملك الخميس</p>
                            <h2 className="text-2xl font-bold text-stone-800">{king}</h2>
                        </div>
                    </div>
                    <div className="bg-rose-50/60 rounded-2xl p-3 flex justify-around text-sm text-stone-700">
                        <span>🗓️ {day}</span>
                        <span>🍽️ {restaurant}</span>
                    </div>
                </div>
            );

        case "neon":
            return (
                <div className="bg-black border border-fuchsia-500/50 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(217,70,239,0.3)]">
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl" />
                    <div className="relative z-10 text-center space-y-3">
                        <p className="text-cyan-400 text-xs font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">King of Thursday</p>
                        <h2 className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(217,70,239,0.9)] flex items-center gap-2 justify-center">
                            <Crown className="w-8 h-8 text-fuchsia-400 drop-shadow-[0_0_10px_rgba(217,70,239,1)]" /> {king}
                        </h2>
                        <div className="flex justify-center gap-4 pt-2">
                            <span className="border border-cyan-400/60 text-cyan-300 px-3 py-1 rounded-lg text-sm shadow-[0_0_10px_rgba(34,211,238,0.4)]">{day}</span>
                            <span className="border border-fuchsia-400/60 text-fuchsia-300 px-3 py-1 rounded-lg text-sm shadow-[0_0_10px_rgba(217,70,239,0.4)]">{restaurant}</span>
                        </div>
                    </div>
                </div>
            );

        case "brutalist":
            return (
                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_#000]">
                    <p className="text-xs font-black uppercase bg-black text-yellow-300 inline-block px-2 py-1 mb-3">ملك الخميس</p>
                    <h2 className="text-5xl font-black text-black uppercase leading-none mb-4">{king}</h2>
                    <div className="flex gap-2">
                        <span className="bg-fuchsia-400 border-2 border-black px-3 py-1 font-bold text-sm shadow-[3px_3px_0_0_#000]">{day}</span>
                        <span className="bg-cyan-400 border-2 border-black px-3 py-1 font-bold text-sm shadow-[3px_3px_0_0_#000]">{restaurant}</span>
                    </div>
                </div>
            );

        case "terminal":
            return (
                <div className="bg-[#0d130d] border border-green-500/40 rounded p-5 font-mono">
                    <div className="flex items-center gap-1.5 mb-3 border-b border-green-500/20 pb-2">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-green-600 text-xs ml-2">king@thursday:~$</span>
                    </div>
                    <p className="text-green-600 text-xs mb-1">&gt; SELECT * FROM king WHERE week=current;</p>
                    <h2 className="text-2xl font-bold text-green-300 mb-2">{"{ "}name: &quot;{king}&quot; {"}"}<span className="animate-pulse">_</span></h2>
                    <p className="text-green-500 text-sm">day: <span className="text-green-300">{day}</span></p>
                    <p className="text-green-500 text-sm">restaurant: <span className="text-green-300">{restaurant}</span></p>
                </div>
            );

        case "luxe":
            return (
                <div className="bg-neutral-900 border border-amber-600/40 rounded-none p-7 relative">
                    <div className="absolute inset-0 border border-amber-600/20 m-2 pointer-events-none" />
                    <div className="relative text-center space-y-3">
                        <p className="text-amber-500/70 text-[10px] tracking-[0.4em] uppercase">— Sovereign of the Week —</p>
                        <h2 className="font-serif text-4xl text-amber-200 italic">{king}</h2>
                        <div className="w-16 h-px bg-amber-600/50 mx-auto" />
                        <div className="flex justify-center gap-8 text-amber-100/60 text-sm font-serif">
                            <span>{day}</span>
                            <span className="text-amber-600">◆</span>
                            <span>{restaurant}</span>
                        </div>
                    </div>
                </div>
            );

        case "comic":
            return (
                <div className="bg-white border-[5px] border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000] relative">
                    <div className="absolute -top-4 right-6 bg-red-500 text-white font-black px-3 py-1 border-4 border-black rounded-xl -rotate-6 text-sm">ملك!</div>
                    <h2 className="text-4xl font-black text-black mb-3" style={{ WebkitTextStroke: "1px #000" }}>{king} 👑</h2>
                    <div className="flex gap-2">
                        <span className="bg-yellow-300 border-[3px] border-black rounded-full px-3 py-1 font-black text-sm">{day}</span>
                        <span className="bg-pink-400 border-[3px] border-black rounded-full px-3 py-1 font-black text-sm">{restaurant}</span>
                    </div>
                </div>
            );

        case "aurora":
            return (
                <div className="backdrop-blur-xl bg-white/15 border border-white/30 rounded-3xl p-6 shadow-2xl">
                    <div className="text-center space-y-3">
                        <p className="text-white/80 text-xs font-semibold tracking-wide">✨ ملك الخميس</p>
                        <h2 className="text-4xl font-bold text-white flex items-center gap-2 justify-center drop-shadow-lg">
                            <Crown className="w-7 h-7" /> {king}
                        </h2>
                        <div className="flex justify-center gap-3">
                            <span className="bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium">🗓️ {day}</span>
                            <span className="bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium">🍽️ {restaurant}</span>
                        </div>
                    </div>
                </div>
            );
    }
}

// ============================================================================
// بطاقة مطعم
// ============================================================================
function RestaurantCard({ style }: { style: StyleKey }) {
    const name = "Shezan";
    const district = "العليا";
    const price = 90;
    const rating = 8.0;

    switch (style) {
        case "current":
            return (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h3 className="font-bold text-white text-lg">{name}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">هندي · {district} · ~{price}﷼/شخص</p>
                        </div>
                        <span className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                            <Star className="w-4 h-4 fill-current" /> {rating}
                        </span>
                    </div>
                </div>
            );

        case "minimal":
            return (
                <div className="bg-white border border-zinc-200 p-6">
                    <div className="flex items-baseline justify-between mb-2">
                        <h3 className="text-2xl font-medium text-zinc-900">{name}</h3>
                        <span className="text-zinc-500 text-sm">⭐ {rating}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500 uppercase tracking-wide">
                        <span>هندي</span>
                        <span>·</span>
                        <span>{district}</span>
                        <span>·</span>
                        <span>{price}﷼</span>
                    </div>
                </div>
            );

        case "glass":
            return (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white text-lg">{name}</h3>
                        <div className="backdrop-blur-md bg-amber-400/20 border border-amber-300/30 px-2 py-1 rounded-full text-amber-200 text-xs font-bold">
                            ⭐ {rating}
                        </div>
                    </div>
                    <div className="flex gap-2 text-xs">
                        <span className="backdrop-blur-md bg-white/5 px-2 py-0.5 rounded-md text-white/70">هندي</span>
                        <span className="backdrop-blur-md bg-white/5 px-2 py-0.5 rounded-md text-white/70">{district}</span>
                        <span className="backdrop-blur-md bg-white/5 px-2 py-0.5 rounded-md text-white/70">{price}﷼</span>
                    </div>
                </div>
            );

        case "editorial":
            return (
                <div className="bg-white border-l-8 border-stone-900 p-5">
                    <div className="flex items-start gap-4">
                        <div className="font-serif text-4xl font-bold text-stone-900">{rating}</div>
                        <div className="flex-1">
                            <h3 className="font-serif text-2xl font-bold text-stone-900">{name}</h3>
                            <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">هندي / {district}</p>
                            <p className="text-stone-700 mt-2 text-sm">حوالي {price} ريال للشخص</p>
                        </div>
                    </div>
                </div>
            );

        case "pastel":
            return (
                <div className="bg-white/70 border-2 border-amber-200/60 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-stone-800 text-lg">{name}</h3>
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">
                            ⭐ {rating}
                        </span>
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs">
                        <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full">هندي</span>
                        <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full">📍 {district}</span>
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{price}﷼</span>
                    </div>
                </div>
            );

        case "neon":
            return (
                <div className="bg-black border border-cyan-500/40 rounded-xl p-5 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-cyan-300 text-lg drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]">{name}</h3>
                        <span className="text-fuchsia-300 text-sm font-bold drop-shadow-[0_0_8px_rgba(217,70,239,0.7)]">★ {rating}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                        <span className="border border-fuchsia-500/40 text-fuchsia-300 px-2 py-0.5 rounded">هندي</span>
                        <span className="border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded">{district}</span>
                        <span className="border border-green-500/40 text-green-300 px-2 py-0.5 rounded">{price}﷼</span>
                    </div>
                </div>
            );

        case "brutalist":
            return (
                <div className="bg-cyan-300 border-4 border-black p-5 shadow-[6px_6px_0_0_#000]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-black text-black uppercase">{name}</h3>
                        <span className="bg-black text-yellow-300 px-2 py-1 font-black">{rating}★</span>
                    </div>
                    <div className="flex gap-2 font-bold text-sm">
                        <span className="bg-white border-2 border-black px-2">هندي</span>
                        <span className="bg-white border-2 border-black px-2">{district}</span>
                        <span className="bg-white border-2 border-black px-2">{price}﷼</span>
                    </div>
                </div>
            );

        case "terminal":
            return (
                <div className="bg-[#0d130d] border border-green-500/40 rounded p-5 font-mono">
                    <p className="text-green-600 text-xs mb-1">&gt; restaurant.find(&quot;{name}&quot;)</p>
                    <div className="flex items-center justify-between">
                        <h3 className="text-green-300 text-lg font-bold">{name}</h3>
                        <span className="text-green-400">[{rating}/10]</span>
                    </div>
                    <p className="text-green-600 text-sm mt-1">type=هندي | area={district} | cost={price}SAR</p>
                </div>
            );

        case "luxe":
            return (
                <div className="bg-neutral-900 border-y border-amber-600/30 p-6">
                    <div className="flex items-baseline justify-between mb-1">
                        <h3 className="font-serif text-2xl text-amber-200 italic">{name}</h3>
                        <span className="text-amber-500 font-serif">{rating} <span className="text-xs">/ 10</span></span>
                    </div>
                    <p className="text-amber-100/50 text-xs tracking-[0.2em] uppercase">هندي · {district} · {price} SAR</p>
                </div>
            );

        case "comic":
            return (
                <div className="bg-yellow-300 border-[4px] border-black rounded-2xl p-5 shadow-[5px_5px_0_0_#000]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-black text-black">{name}</h3>
                        <span className="bg-red-500 text-white border-[3px] border-black rounded-full w-12 h-12 flex items-center justify-center font-black -rotate-12">{rating}</span>
                    </div>
                    <div className="flex gap-2 font-black text-xs">
                        <span className="bg-white border-2 border-black rounded-full px-2 py-0.5">هندي</span>
                        <span className="bg-pink-400 border-2 border-black rounded-full px-2 py-0.5">{district}</span>
                        <span className="bg-green-400 border-2 border-black rounded-full px-2 py-0.5">{price}﷼</span>
                    </div>
                </div>
            );

        case "aurora":
            return (
                <div className="backdrop-blur-xl bg-white/15 border border-white/25 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white text-lg">{name}</h3>
                        <span className="bg-white/25 backdrop-blur px-2.5 py-1 rounded-full text-sm font-bold">⭐ {rating}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                        <span className="bg-white/15 px-2.5 py-1 rounded-full">هندي</span>
                        <span className="bg-white/15 px-2.5 py-1 rounded-full">📍 {district}</span>
                        <span className="bg-white/15 px-2.5 py-1 rounded-full">{price}﷼</span>
                    </div>
                </div>
            );
    }
}

// ============================================================================
// بطاقة المتصدرين (صف صغير)
// ============================================================================
function LeaderboardCard({ style }: { style: StyleKey }) {
    const items = [
        { name: "شوكا", score: 4.6, rank: 1 },
        { name: "خالد", score: 4.3, rank: 2 },
        { name: "نواف", score: 4.1, rank: 3 },
    ];

    switch (style) {
        case "current":
            return (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-400" /> المتصدرين
                    </h3>
                    <div className="space-y-2">
                        {items.map((it) => (
                            <div key={it.name} className="flex items-center justify-between bg-slate-950/40 rounded-xl px-3 py-2">
                                <span className="flex items-center gap-2 text-slate-200">
                                    <span className="text-amber-400 font-bold w-5">#{it.rank}</span> {it.name}
                                </span>
                                <span className="text-amber-400 font-mono font-bold">{it.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case "minimal":
            return (
                <div className="bg-white border border-zinc-200 p-6">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">المتصدرين</h3>
                    {items.map((it, i) => (
                        <div
                            key={it.name}
                            className={`flex justify-between py-3 text-zinc-900 ${i < items.length - 1 ? "border-b border-zinc-100" : ""}`}
                        >
                            <span className="font-medium">
                                <span className="text-zinc-400 ml-3 font-mono text-sm">{it.rank}</span>
                                {it.name}
                            </span>
                            <span className="font-mono text-zinc-600">{it.score}</span>
                        </div>
                    ))}
                </div>
            );

        case "glass":
            return (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-5">
                    <h3 className="text-white/80 text-sm font-bold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> المتصدرين
                    </h3>
                    <div className="space-y-2">
                        {items.map((it) => (
                            <div key={it.name} className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex justify-between">
                                <span className="text-white">
                                    <span className="text-amber-300 font-bold ml-2">#{it.rank}</span> {it.name}
                                </span>
                                <span className="text-amber-300 font-bold">{it.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case "editorial":
            return (
                <div className="bg-white p-6 border-y-2 border-stone-900">
                    <h3 className="font-serif text-3xl text-stone-900 mb-4">المتصدرين</h3>
                    {items.map((it) => (
                        <div key={it.name} className="flex items-baseline gap-4 py-3 border-b border-stone-200 last:border-0">
                            <span className="font-serif text-2xl font-bold text-stone-900 w-8">{it.rank}.</span>
                            <span className="flex-1 font-medium text-stone-800">{it.name}</span>
                            <span className="font-serif text-xl font-bold text-stone-900">{it.score}</span>
                        </div>
                    ))}
                </div>
            );

        case "pastel":
            return (
                <div className="bg-white/70 border-2 border-sky-200/60 rounded-3xl p-5">
                    <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                        🏆 المتصدرين
                    </h3>
                    <div className="space-y-2">
                        {items.map((it) => {
                            const colors = ["bg-amber-100 text-amber-700", "bg-zinc-100 text-zinc-600", "bg-orange-100 text-orange-700"];
                            return (
                                <div key={it.name} className="flex items-center justify-between bg-rose-50/60 rounded-2xl px-3 py-2">
                                    <span className="flex items-center gap-2">
                                        <span className={`${colors[it.rank - 1]} w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold`}>
                                            {it.rank}
                                        </span>
                                        <span className="text-stone-800 font-semibold">{it.name}</span>
                                    </span>
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
                                        {it.score}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );

        case "neon":
            return (
                <div className="bg-black border border-fuchsia-500/40 rounded-xl p-5 shadow-[0_0_20px_rgba(217,70,239,0.2)]">
                    <h3 className="text-cyan-300 text-sm font-bold mb-3 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]">⚡ Leaderboard</h3>
                    <div className="space-y-2">
                        {items.map((it) => (
                            <div key={it.name} className="flex justify-between items-center border border-white/10 rounded-lg px-3 py-2">
                                <span className="text-white"><span className="text-fuchsia-400 font-bold ml-2 drop-shadow-[0_0_6px_rgba(217,70,239,0.8)]">0{it.rank}</span> {it.name}</span>
                                <span className="text-cyan-300 font-mono font-bold drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]">{it.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case "brutalist":
            return (
                <div className="bg-fuchsia-400 border-4 border-black p-5 shadow-[6px_6px_0_0_#000]">
                    <h3 className="text-2xl font-black text-black uppercase mb-3 bg-black text-white inline-block px-2">المتصدرين</h3>
                    {items.map((it) => (
                        <div key={it.name} className="flex justify-between items-center bg-white border-2 border-black px-3 py-2 mb-2 font-black">
                            <span className="text-black">{it.rank}. {it.name}</span>
                            <span className="bg-black text-yellow-300 px-2">{it.score}</span>
                        </div>
                    ))}
                </div>
            );

        case "terminal":
            return (
                <div className="bg-[#0d130d] border border-green-500/40 rounded p-5 font-mono">
                    <p className="text-green-600 text-xs mb-3">&gt; leaderboard --top 3</p>
                    {items.map((it) => (
                        <div key={it.name} className="flex justify-between text-sm py-1">
                            <span className="text-green-400">[{it.rank}] <span className="text-green-200">{it.name}</span></span>
                            <span className="text-green-500">{it.score} ████</span>
                        </div>
                    ))}
                </div>
            );

        case "luxe":
            return (
                <div className="bg-neutral-900 border border-amber-600/30 p-6">
                    <h3 className="font-serif text-xl text-amber-200 italic mb-4 text-center">— المتصدرون —</h3>
                    {items.map((it) => (
                        <div key={it.name} className="flex items-center gap-4 py-2.5 border-b border-amber-600/15 last:border-0">
                            <span className="font-serif text-amber-500 text-lg w-6">{it.rank}.</span>
                            <span className="flex-1 text-amber-100/80 font-serif">{it.name}</span>
                            <span className="font-serif text-amber-300">{it.score}</span>
                        </div>
                    ))}
                </div>
            );

        case "comic":
            return (
                <div className="bg-pink-400 border-[5px] border-black rounded-3xl p-5 shadow-[6px_6px_0_0_#000]">
                    <h3 className="text-3xl font-black text-black mb-3" style={{ WebkitTextStroke: "1px #000" }}>المتصدرين! 🏆</h3>
                    <div className="space-y-2">
                        {items.map((it) => {
                            const c = ["bg-yellow-300", "bg-zinc-200", "bg-orange-400"];
                            return (
                                <div key={it.name} className="flex items-center justify-between bg-white border-[3px] border-black rounded-xl px-3 py-2">
                                    <span className="flex items-center gap-2 font-black">
                                        <span className={`${c[it.rank - 1]} border-2 border-black w-7 h-7 rounded-full flex items-center justify-center`}>{it.rank}</span>
                                        {it.name}
                                    </span>
                                    <span className="bg-green-400 border-2 border-black px-2 rounded-full font-black">{it.score}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );

        case "aurora":
            return (
                <div className="backdrop-blur-xl bg-white/15 border border-white/25 rounded-2xl p-5 shadow-xl">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">🏆 المتصدرين</h3>
                    <div className="space-y-2">
                        {items.map((it) => (
                            <div key={it.name} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
                                <span className="text-white flex items-center gap-2">
                                    <span className="bg-white/25 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">{it.rank}</span>
                                    {it.name}
                                </span>
                                <span className="bg-white/25 px-3 py-1 rounded-full text-sm font-bold">{it.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
    }
}

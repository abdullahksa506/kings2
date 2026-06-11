"use client";

/*
 * تصاميم تفاعلية للمعاينة — كل واحد ميكانيكا مختلفة جذرياً (مو بس ألوان):
 *  - stories : قصص تُسحب بالنقر (زي إنستقرام)
 *  - console : تكتب أوامر ويرد عليك (تيرمنال حي)
 *  - bento   : مربعات تنقرها فتتوسّع وتنقلب
 * نفس البيانات والوظائف، بس طريقة التفاعل مختلفة.
 */

import { useRef, useState } from "react";
import { Crown, MapPin, Calendar, Star, Trophy, Vote, ChevronRight, ChevronLeft } from "lucide-react";

// بيانات تجريبية مشتركة
const KING = "هشام";
const DAY = "الخميس";
const RESTAURANT = "البيك";
const TOP = [
    { name: "شوكا", score: 4.6 },
    { name: "خالد", score: 4.3 },
    { name: "نواف", score: 4.1 },
];
const VOTES = [
    { name: "البيك", v: 3 },
    { name: "هرفي", v: 2 },
    { name: "كودو", v: 1 },
];
const VOTE_TOTAL = VOTES.reduce((s, o) => s + o.v, 0);

// ============================================================================
// ① STORIES — قصص تفاعلية تُسحب
// ============================================================================
export function StoriesExperience() {
    const slides = ["king", "restaurant", "vote", "top"] as const;
    const [i, setI] = useState(0);
    const next = () => setI((p) => (p + 1) % slides.length);
    const prev = () => setI((p) => (p - 1 + slides.length) % slides.length);

    const bg = [
        "from-amber-500 via-orange-600 to-rose-700",
        "from-emerald-500 via-teal-600 to-cyan-700",
        "from-fuchsia-500 via-purple-600 to-indigo-700",
        "from-sky-500 via-blue-600 to-violet-700",
    ][i];

    return (
        <div className="max-w-sm mx-auto">
            <div className={`relative rounded-[2rem] overflow-hidden bg-gradient-to-br ${bg} shadow-2xl select-none`} style={{ height: 460 }}>
                {/* أشرطة التقدّم */}
                <div className="absolute top-3 inset-x-3 z-20 flex gap-1.5">
                    {slides.map((_, k) => (
                        <div key={k} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                            <div className={`h-full bg-white transition-all duration-300 ${k <= i ? "w-full" : "w-0"}`} />
                        </div>
                    ))}
                </div>

                {/* مناطق النقر */}
                <button onClick={prev} className="absolute inset-y-0 right-0 w-1/3 z-10" aria-label="السابق" />
                <button onClick={next} className="absolute inset-y-0 left-0 w-2/3 z-10" aria-label="التالي" />

                {/* المحتوى */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 pt-10">
                    {slides[i] === "king" && (
                        <>
                            <Crown className="w-16 h-16 mb-4 drop-shadow-lg" />
                            <p className="text-white/80 text-sm mb-1">ملك هذا الأسبوع</p>
                            <h2 className="text-5xl font-black drop-shadow-lg">{KING}</h2>
                            <p className="mt-4 text-white/90 text-lg">🗓️ {DAY}</p>
                        </>
                    )}
                    {slides[i] === "restaurant" && (
                        <>
                            <MapPin className="w-16 h-16 mb-4 drop-shadow-lg" />
                            <p className="text-white/80 text-sm mb-1">المطعم المختار</p>
                            <h2 className="text-5xl font-black drop-shadow-lg">{RESTAURANT}</h2>
                            <p className="mt-4 bg-white/20 px-4 py-1.5 rounded-full">الميزانية ~40﷼/شخص</p>
                        </>
                    )}
                    {slides[i] === "vote" && (
                        <div className="w-full">
                            <Vote className="w-14 h-14 mb-4 mx-auto drop-shadow-lg" />
                            <p className="text-white/80 text-sm mb-4">التصويت الحالي</p>
                            <div className="space-y-3 text-right">
                                {VOTES.map((o) => (
                                    <div key={o.name}>
                                        <div className="flex justify-between text-sm mb-1"><span>{o.name}</span><span>{Math.round((o.v / VOTE_TOTAL) * 100)}%</span></div>
                                        <div className="h-2.5 bg-white/25 rounded-full"><div className="h-2.5 bg-white rounded-full transition-all duration-500" style={{ width: `${(o.v / VOTE_TOTAL) * 100}%` }} /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {slides[i] === "top" && (
                        <div className="w-full">
                            <Trophy className="w-14 h-14 mb-4 mx-auto drop-shadow-lg" />
                            <p className="text-white/80 text-sm mb-4">المتصدرين</p>
                            <div className="space-y-2">
                                {TOP.map((t, k) => (
                                    <div key={t.name} className="flex items-center justify-between bg-white/15 rounded-2xl px-4 py-2.5">
                                        <span className="font-bold">{["🥇", "🥈", "🥉"][k]} {t.name}</span>
                                        <span className="font-mono font-bold">{t.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* أسهم */}
                <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center gap-6 text-white/70 pointer-events-none">
                    <ChevronRight className="w-5 h-5" />
                    <span className="text-xs">انقر يمين/يسار للتنقّل</span>
                    <ChevronLeft className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// ② CONSOLE — تيرمنال حي تكتب فيه أوامر
// ============================================================================
export function ConsoleExperience() {
    const [history, setHistory] = useState<{ cmd: string; out: string[] }[]>([
        { cmd: "", out: ["مرحباً بك في عرش الخميس 👑", "اكتب أمر أو اضغط اقتراح. جرّب: مساعدة"] },
    ]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const runCmd = (raw: string) => {
        const cmd = raw.trim();
        if (!cmd) return;
        let out: string[] = [];
        if (/مساعدة|help|اوامر|أوامر/i.test(cmd)) out = ["الأوامر: الملك · مطعم · تصويت · المتصدرين · مسح"];
        else if (/الملك|king/i.test(cmd)) out = [`👑 ملك الأسبوع: ${KING}`, `🗓️ اليوم: ${DAY}`];
        else if (/مطعم|restaurant/i.test(cmd)) out = [`🍽️ المطعم: ${RESTAURANT}`, "💰 ~40 ريال للشخص"];
        else if (/تصويت|vote/i.test(cmd)) out = VOTES.map((o) => `${o.name}: ${"█".repeat(o.v * 2)} ${Math.round((o.v / VOTE_TOTAL) * 100)}%`);
        else if (/متصدر|top|ترتيب/i.test(cmd)) out = TOP.map((t, k) => `${k + 1}. ${t.name} — ${t.score}`);
        else if (/مسح|clear/i.test(cmd)) { setHistory([]); setInput(""); return; }
        else out = [`أمر غير معروف: "${cmd}" — اكتب "مساعدة"`];

        setHistory((h) => [...h, { cmd, out }]);
        setInput("");
        setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    };

    const chips = ["الملك", "مطعم", "تصويت", "المتصدرين", "مسح"];

    return (
        <div className="bg-[#0b0f0b] border border-green-500/40 rounded-xl overflow-hidden font-mono shadow-2xl">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0d130d] border-b border-green-500/20">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-green-600 text-xs mr-2">king@thursday — تيرمنال حي</span>
            </div>

            <div ref={scrollRef} className="p-4 h-72 overflow-y-auto text-sm" dir="ltr">
                {history.map((h, k) => (
                    <div key={k} className="mb-2">
                        {h.cmd && <p className="text-green-300">$ {h.cmd}</p>}
                        {h.out.map((line, j) => (
                            <p key={j} className="text-green-500 whitespace-pre-wrap" dir="auto">{line}</p>
                        ))}
                    </div>
                ))}
            </div>

            <div className="px-4 pb-2 flex flex-wrap gap-1.5" dir="rtl">
                {chips.map((c) => (
                    <button key={c} onClick={() => runCmd(c)} className="text-xs border border-green-500/30 text-green-400 px-2 py-0.5 rounded hover:bg-green-500/10">
                        {c}
                    </button>
                ))}
            </div>

            <form
                onSubmit={(e) => { e.preventDefault(); runCmd(input); }}
                className="flex items-center gap-2 px-4 py-3 border-t border-green-500/20"
                dir="ltr"
            >
                <span className="text-green-400">$</span>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اكتب أمر..."
                    className="flex-1 bg-transparent text-green-300 outline-none placeholder:text-green-700"
                    dir="auto"
                />
                <button type="submit" className="text-green-400 text-xs border border-green-500/40 px-2 py-0.5 rounded hover:bg-green-500/10">↵</button>
            </form>
        </div>
    );
}

// ============================================================================
// ③ BENTO — مربعات تنقرها فتنقلب وتتوسّع
// ============================================================================
export function BentoExperience() {
    const [open, setOpen] = useState<string | null>(null);
    const tile = (id: string, cls: string, front: React.ReactNode, back: React.ReactNode) => (
        <button
            onClick={() => setOpen((p) => (p === id ? null : id))}
            className={`${cls} relative rounded-3xl p-4 text-right overflow-hidden transition-all duration-300 ${open === id ? "ring-2 ring-white scale-[1.02]" : ""}`}
            style={{ perspective: 800 }}
        >
            <div className={`transition-all duration-500 ${open === id ? "opacity-0 absolute" : "opacity-100"}`}>{front}</div>
            <div className={`transition-all duration-500 ${open === id ? "opacity-100" : "opacity-0 absolute inset-0 p-4"}`}>{back}</div>
        </button>
    );

    return (
        <div className="grid grid-cols-2 gap-3 auto-rows-[110px]">
            {tile(
                "king",
                "col-span-2 row-span-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white",
                <div className="h-full flex flex-col justify-between">
                    <Crown className="w-8 h-8" />
                    <div><p className="text-white/80 text-xs">ملك الأسبوع</p><h3 className="text-3xl font-black">{KING}</h3></div>
                    <p className="text-white/70 text-xs">انقر للتفاصيل ↺</p>
                </div>,
                <div className="h-full flex flex-col justify-center gap-2 text-white">
                    <p className="text-lg font-bold">👑 {KING}</p>
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {DAY}</p>
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {RESTAURANT}</p>
                    <p className="text-white/70 text-xs mt-2">انقر للرجوع ↺</p>
                </div>,
            )}
            {tile(
                "rest",
                "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
                <div className="h-full flex flex-col justify-between"><MapPin className="w-6 h-6" /><div><p className="text-white/80 text-[10px]">المطعم</p><h3 className="text-lg font-bold">{RESTAURANT}</h3></div></div>,
                <div className="h-full flex flex-col justify-center text-white text-sm"><p className="font-bold">{RESTAURANT}</p><p className="text-white/80 text-xs mt-1">برجر · ~40﷼</p><p className="flex items-center gap-1 text-amber-200 mt-1"><Star className="w-3 h-3 fill-current" /> 8.0</p></div>,
            )}
            {tile(
                "vote",
                "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white",
                <div className="h-full flex flex-col justify-between"><Vote className="w-6 h-6" /><div><p className="text-white/80 text-[10px]">التصويت</p><h3 className="text-lg font-bold">{RESTAURANT} يتصدّر</h3></div></div>,
                <div className="h-full flex flex-col justify-center gap-1.5 text-white">
                    {VOTES.map((o) => (
                        <div key={o.name}><div className="flex justify-between text-[11px]"><span>{o.name}</span><span>{o.v}</span></div><div className="h-1.5 bg-white/25 rounded-full"><div className="h-1.5 bg-white rounded-full" style={{ width: `${(o.v / VOTE_TOTAL) * 100}%` }} /></div></div>
                    ))}
                </div>,
            )}
            {tile(
                "top",
                "col-span-2 bg-gradient-to-br from-sky-500 to-indigo-600 text-white",
                <div className="h-full flex items-center justify-between"><div className="flex items-center gap-2"><Trophy className="w-6 h-6" /><span className="font-bold">المتصدرين</span></div><span className="text-white/80 text-sm">🥇 {TOP[0].name}</span></div>,
                <div className="h-full flex items-center justify-around text-white">
                    {TOP.map((t, k) => (<div key={t.name} className="text-center"><div className="text-xl">{["🥇", "🥈", "🥉"][k]}</div><div className="text-xs font-bold">{t.name}</div><div className="text-[10px] text-white/80">{t.score}</div></div>))}
                </div>,
            )}
        </div>
    );
}

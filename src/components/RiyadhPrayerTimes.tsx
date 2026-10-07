"use client";
/*
 * 🤖 سألوا الروبوت: وين الصلاة القادمة؟ قال: قدامك بالذهبي، ما تحتاج خريطة 😂🕌
 */
import { useEffect, useState } from "react";
import { Clock3, MapPin, MoonStar, Sunrise } from "lucide-react";
import { nextPrayer, PRAYERS, PrayerSchedule, riyadhDate, RIYADH_TIME_ZONE } from "@/lib/prayerTimes";

function displayTime(time: string) {
    const [hour, minute] = time.split(":").map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "م" : "ص"}`;
}

export default function RiyadhPrayerTimes() {
    const [now, setNow] = useState<number | null>(null);
    const [schedule, setSchedule] = useState<PrayerSchedule | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const date = now === null ? null : riyadhDate(new Date(now));

    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();
        const timer = setInterval(tick, 30000);
        document.addEventListener("visibilitychange", tick);
        window.addEventListener("focus", tick);
        return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); window.removeEventListener("focus", tick); };
    }, []);

    useEffect(() => {
        if (!date) return;
        const controller = new AbortController();
        let retry: ReturnType<typeof setTimeout>;
        fetch("/api/prayer-times", { signal: controller.signal, cache: "no-store" })
            .then(async response => { if (!response.ok) throw new Error("Unavailable"); return response.json() as Promise<PrayerSchedule>; })
            .then(data => {
                if (data.today?.date !== date) throw new Error("Stale day");
                setSchedule(data); setError(false);
                if (!data.tomorrow) retry = setTimeout(() => setAttempt(a => a + 1), 60000);
            })
            .catch(() => {
                if (controller.signal.aborted) return;
                setError(true);
                retry = setTimeout(() => setAttempt(a => a + 1), 60000);
            });
        return () => { controller.abort(); clearTimeout(retry); };
    }, [date, attempt]);

    const current = schedule?.today.date === date ? schedule : null;
    const next = current && now !== null ? nextPrayer(current, now) : null;
    const minutes = next && now !== null ? Math.ceil((next.at - now) / 60000) : 0;
    const remaining = minutes >= 60 ? `${Math.floor(minutes / 60)} س و${minutes % 60} د` : `${minutes} دقيقة`;
    return (
        <section aria-label="مواقيت الصلاة في الرياض" className="mb-6 max-w-3xl mx-auto rounded-2xl border border-amber-400/20 bg-slate-900/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-amber-200 flex items-center gap-2"><MoonStar className="w-5 h-5" aria-hidden="true" /> مواقيت الصلاة</h2>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" /> الرياض {now !== null && `· ${new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { timeZone: RIYADH_TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(now)}`}</p>
                </div>
                {next && <div className="rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200"><span className="font-bold">{next.label}{next.tomorrow ? " غدًا" : ""}</span><span className="block text-xs mt-1 flex items-center gap-1"><Clock3 className="w-3 h-3" aria-hidden="true" /> باقي {remaining}</span></div>}
            </div>
            {current ? <>
                <div className="grid grid-cols-6 sm:grid-cols-5 gap-2">
                    {PRAYERS.map((prayer, index) => <div key={prayer.key} className={`${index < 3 ? "col-span-2" : "col-span-3"} sm:col-span-1 rounded-xl border px-2 py-3 text-center ${next?.key === prayer.key && !next.tomorrow ? "border-amber-300/50 bg-amber-300/10 text-amber-100" : "border-slate-700/60 bg-slate-950/30 text-slate-200"}`}>
                        <p className="text-xs mb-2">{prayer.label}</p><time dateTime={`${current.today.date}T${current.today.timings[prayer.key]}:00+03:00`} className="text-base font-bold tabular-nums whitespace-nowrap">{displayTime(current.today.timings[prayer.key])}</time>
                    </div>)}
                </div>
                <div className="flex flex-wrap justify-between gap-2 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Sunrise className="w-3.5 h-3.5" aria-hidden="true" /> الشروق {displayTime(current.today.timings.Sunrise)}</span>
                    <a href="https://aladhan.com/prayer-times-api" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-600 underline-offset-2">AlAdhan · طريقة أم القرى</a>
                </div>
            </> : error ? <div role="status" className="flex items-center justify-between gap-3 text-sm text-slate-300"><p>تعذّر تحميل المواقيت. نحاول مجددًا.</p><button type="button" onClick={() => setAttempt(a => a + 1)} className="shrink-0 border border-slate-600 rounded-lg px-3 py-2">إعادة المحاولة</button></div> : <p role="status" className="text-sm text-slate-400 py-4">جارٍ تحميل مواقيت الرياض…</p>}
        </section>
    );
}

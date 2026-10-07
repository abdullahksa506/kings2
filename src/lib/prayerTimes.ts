/*
 * 🤖 الروبوت ضبط ساعته على الرياض، وقال: هالمرة ما نحسب العصر بتوقيت السيرفر 😂🕰️
 */
export const RIYADH_TIME_ZONE = "Asia/Riyadh";
export const PRAYERS = [
    { key: "Fajr", label: "الفجر" },
    { key: "Dhuhr", label: "الظهر" },
    { key: "Asr", label: "العصر" },
    { key: "Maghrib", label: "المغرب" },
    { key: "Isha", label: "العشاء" },
] as const;
export type PrayerKey = typeof PRAYERS[number]["key"];
export type PrayerDay = { date: string; timings: Record<PrayerKey | "Sunrise", string> };
export type PrayerSchedule = { today: PrayerDay; tomorrow: PrayerDay | null };

export function riyadhDate(now: Date): string {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: RIYADH_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (name: string) => parts.find(p => p.type === name)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
}

export function followingDate(date: string): string {
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
}

export function prayerTimestamp(date: string, time: string): number {
    return Date.parse(`${date}T${time}:00+03:00`);
}

export function nextPrayer(schedule: PrayerSchedule, now: number) {
    for (const day of [schedule.today, schedule.tomorrow]) {
        if (!day) continue;
        for (const prayer of PRAYERS) {
            const at = prayerTimestamp(day.date, day.timings[prayer.key]);
            if (at > now) return { ...prayer, at, time: day.timings[prayer.key], tomorrow: day.date !== schedule.today.date };
        }
    }
    return null;
}

export function normalizePrayerDay(date: string, timings: Record<string, unknown>): PrayerDay {
    const result = {} as PrayerDay["timings"];
    for (const key of [...PRAYERS.map(p => p.key), "Sunrise"] as const) {
        const value = timings[key];
        const match = typeof value === "string" ? /^(\d{2}):(\d{2})(?:\s|$)/.exec(value) : null;
        if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error("Invalid prayer time");
        result[key] = `${match[1]}:${match[2]}`;
    }
    return { date, timings: result };
}

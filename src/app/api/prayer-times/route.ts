/*
 * 🤖 الروبوت جاب المواقيت مرة وخلاها للشلة كلها؛ حتى الساعة تحب التوفير 😂🕌
 */
import { NextResponse } from "next/server";
import { followingDate, normalizePrayerDay, riyadhDate, RIYADH_TIME_ZONE } from "@/lib/prayerTimes";

async function getDay(date: string) {
    const [year, month, day] = date.split("-");
    const params = new URLSearchParams({ latitude: "24.7136", longitude: "46.6753", method: "4", school: "0", timezonestring: RIYADH_TIME_ZONE });
    const response = await fetch(`https://api.aladhan.com/v1/timings/${day}-${month}-${year}?${params}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Prayer source unavailable");
    const body = await response.json();
    if (body.code !== 200 || body.data?.date?.gregorian?.date !== `${day}-${month}-${year}` || body.data?.meta?.timezone !== RIYADH_TIME_ZONE || body.data?.meta?.method?.id !== 4) throw new Error("Unexpected prayer schedule");
    return normalizePrayerDay(date, body.data.timings);
}

export async function GET() {
    const date = riyadhDate(new Date());
    try {
        const [today, tomorrow] = await Promise.all([getDay(date), getDay(followingDate(date)).catch(() => null)]);
        return NextResponse.json({ today, tomorrow }, { headers: { "Cache-Control": "no-store" } });
    } catch {
        return NextResponse.json({ error: "تعذّر تحميل مواقيت الرياض، حاول مجددًا." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
}

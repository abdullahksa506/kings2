/*
 * 🤖 روبوت التذكير حاول يدخل السيرفر بحساب المتصفح!
 * قلنا له: خذ البيانات من الأدمن، مو من لوكل ستورج الجوال 😂🔔
 */
import { adminDb } from "@/lib/firebase-admin";
import type { WeekSession } from "@/lib/services";
import { KING_ORDER } from "@/lib/weekLifecycle.server";

export async function getReminderWeek(): Promise<WeekSession | null> {
    const snap = await adminDb.collection("weeks").where("status", "==", "pending").get();
    const weeks = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeekSession));
    const ms = (w: WeekSession) => w.createdAt?.toMillis?.() ?? w.weekNumber ?? 0;
    return weeks.sort((a, b) => ms(b) - ms(a))[0] ?? null;
}

export async function missingRatingMembers(week: WeekSession): Promise<string[]> {
    const snap = await adminDb.collection("ratings").where("weekId", "==", week.id).get();
    const rated = new Set(snap.docs.map(d => d.data().userName));
    return KING_ORDER.filter(name => name !== week.king &&
        (week.responded || []).includes(name) && !(week.absentees || []).includes(name) && !rated.has(name));
}

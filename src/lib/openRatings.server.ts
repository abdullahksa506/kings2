/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش ٢٣ أسبوع تقييمهم مفتوح من سنة؟"
 * قال: "لأن أحد فتح الباب وما رجع سكّره... زي مكيّف بيت جدّتكم 😂🌬️"
 * قالوا: "والحل؟" قال: "زر واحد يسكّرها كلها — وأنا مستعد أكتبه بس لا تلوموني 🔒"
 */

/**
 * 🔒 إدارة التقييمات المفتوحة.
 *
 * المشكلة: لا يوجد ما يُغلق التقييم تلقائياً — لا الأتمتة (نائمة) ولا الكرون
 * (ما اشتغل أصلاً). فكل أسبوع فُتح تقييمه يبقى مفتوحاً للأبد، وأي عضو يقدر
 * يرجع بعد شهور ويقيّم طلعة قديمة فتتغيّر المعدلات.
 *
 * السيرفر يمنع التقييم على الأسابيع المقفلة فعلاً (submitRating)، فالحل
 * إداري لا أمني: نعطي العميد رؤية لما هو مفتوح وزراً يقفله.
 *
 * 🗑️ للحذف الكامل: REMOVED_FEATURES.md — قسم «التقييمات المفتوحة».
 */

import { adminDb } from "@/lib/firebase-admin";

export type OpenRatingWeek = {
    id: string;
    restaurant: string | null;
    king: string | null;
    cycleNumber: number;
    weekNumber: number;
    openedAt: number | null;
    daysOpen: number | null;
    ratingCount: number;
    eligibleCount: number;
    missing: string[];
};

const KINGS = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];

export async function listOpenRatingWeeks(): Promise<OpenRatingWeek[]> {
    const [weeksSnap, ratingsSnap] = await Promise.all([
        adminDb.collection("weeks").where("ratingEnabled", "==", true).get(),
        adminDb.collection("ratings").get(),
    ]);

    const counts = new Map<string, Set<string>>();
    ratingsSnap.forEach((d) => {
        const r = d.data() as { weekId?: string; userName?: string };
        if (!r.weekId || r.userName === "System_Import") return;
        if (!counts.has(r.weekId)) counts.set(r.weekId, new Set());
        counts.get(r.weekId)!.add(String(r.userName || ""));
    });

    const now = Date.now();
    const rows: OpenRatingWeek[] = [];
    weeksSnap.forEach((d) => {
        const w = d.data() as any;
        if (!w.restaurant) return;                       // أسابيع بلا مطعم لا تُقيَّم أصلاً
        const openedAt = w.ratingEnabledAt?.toMillis?.() ?? null;
        const rated = counts.get(d.id) ?? new Set<string>();
        const absent = new Set<string>(Array.isArray(w.absentees) ? w.absentees : []);
        const eligible = KINGS.filter((n) => n !== w.king && !absent.has(n));
        rows.push({
            id: d.id,
            restaurant: w.restaurant ?? null,
            king: w.king ?? null,
            cycleNumber: Number(w.cycleNumber ?? 0),
            weekNumber: Number(w.weekNumber ?? 0),
            openedAt,
            daysOpen: openedAt ? (now - openedAt) / 86_400_000 : null,
            ratingCount: rated.size,
            eligibleCount: eligible.length,
            missing: eligible.filter((n) => !rated.has(n)),
        });
    });

    // الأقدم فتحاً أولاً؛ ومن لا تاريخ له فهو الأقدم على الإطلاق
    return rows.sort((a, b) => (a.openedAt ?? 0) - (b.openedAt ?? 0));
}

/** إغلاق التقييم لأسابيع محددة. يرجّع عدد ما أُغلق فعلاً. */
export async function closeRatingForWeeks(weekIds: string[]): Promise<{ closed: number }> {
    const ids = [...new Set(weekIds.filter((x) => typeof x === "string" && x.trim()))].slice(0, 200);
    if (!ids.length) return { closed: 0 };

    let closed = 0;
    for (let i = 0; i < ids.length; i += 400) {
        const batch = adminDb.batch();
        ids.slice(i, i + 400).forEach((id) => {
            batch.update(adminDb.collection("weeks").doc(id), { ratingEnabled: false });
            closed++;
        });
        await batch.commit();
    }
    return { closed };
}

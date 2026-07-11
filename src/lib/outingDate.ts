/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كيف تعرف تاريخ الطلعة؟"
 * قال: "أحسبها بتوقيت الرياض... مو زي السيرفر اللي عايش في UTC ومنكر الجدول 😂🕰️"
 *
 * تاريخ الطلعة الصحيح: نعتمد وقت الرياض (UTC+3)، ونسحب لحظة إنشاء السجل ليوم
 * الطلعة الفعلي (خميس/جمعة). الطلعات التاريخية (المستوردة) تواريخها ماكانت
 * محفوظة أصلاً — نعرضها "طلعة تاريخية" بدل تاريخ كاذب.
 */

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000; // Riyadh = UTC+3 (no DST)
const DAY_MS = 24 * 60 * 60 * 1000;
const AR_WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAY_TO_IDX: Record<string, number> = {
    "الأحد": 0, "الإثنين": 1, "الاثنين": 1, "الثلاثاء": 2, "الأربعاء": 3, "الخميس": 4, "الجمعة": 5, "السبت": 6,
};

type WeekLike = {
    day?: string | null;
    createdAt?: { toMillis?: () => number } | null;
    historicalAverageRating?: number;
};

/** Imported/organizational week carrying a pre-computed historical average. */
function isHistoricalWeek(w: WeekLike): boolean {
    return w?.historicalAverageRating !== undefined;
}

/**
 * The true outing date (Riyadh time). `createdAt` is the record-creation moment,
 * usually 0-2 days AFTER the outing, so we snap it back to the most recent
 * occurrence of the outing weekday (الخميس/الجمعة). Returns null for historical
 * imports — their real dates were never stored.
 */
export function outingDate(week: WeekLike): Date | null {
    if (isHistoricalWeek(week)) return null;
    const ms = week.createdAt?.toMillis?.();
    if (!ms) return null;
    let outMs = ms;
    const target = week.day ? DAY_TO_IDX[week.day] : undefined;
    if (target !== undefined) {
        // The week is created FIRST; the outing is the first خميس/جمعة on-or-after
        // that (createdAt = week start, not the outing day). Snap FORWARD.
        const riyadhWeekday = new Date(ms + RIYADH_OFFSET_MS).getUTCDay();
        const forward = (target - riyadhWeekday + 7) % 7;
        outMs = ms + forward * DAY_MS;
    }
    return new Date(outMs);
}

/**
 * Display label — always Riyadh time + Gregorian (not the phone's timezone, and
 * not Hijri): "الخميس 16 أبريل 2026" · or "طلعة تاريخية" for imports.
 */
export function outingDateLabel(week: WeekLike): string {
    if (isHistoricalWeek(week)) return "طلعة تاريخية";
    const d = outingDate(week);
    if (!d) return "بدون تاريخ";
    const r = new Date(d.getTime() + RIYADH_OFFSET_MS); // read parts as Riyadh-local
    return `${AR_WEEKDAYS[r.getUTCDay()]} ${r.getUTCDate()} ${AR_MONTHS[r.getUTCMonth()]} ${r.getUTCFullYear()}`;
}

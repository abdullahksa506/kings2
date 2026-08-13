/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "وش سر طلعة السبت؟"
 * قال: "ما أقدر أقول... أنا مبرمج على الكتمان، مو مثل شوكا 🤐😂"
 *
 * طلعة السبت السرّية — ثوابت ومساعدات مشتركة (بدون أي اعتماد على Firebase
 * عشان تُستخدم في العميل والسيرفر معاً).
 */

/** عميد يوم السبت — هو الوحيد اللي يتحكم بالوصول والدستور. */
export const SATURDAY_DEAN = "هشام";

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000; // Riyadh = UTC+3 (no DST)
const DAY_MS = 24 * 60 * 60 * 1000;
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/**
 * The Saturday this week refers to: today if it IS Saturday (Riyadh), otherwise
 * the upcoming one. Returned as a stable YYYY-MM-DD key so each Saturday gets
 * exactly one document — which is what makes auto-creation idempotent.
 */
export function currentSaturdayKey(nowMs: number = Date.now()): string {
    const r = new Date(nowMs + RIYADH_OFFSET_MS);
    const dow = r.getUTCDay();              // 6 = Saturday
    const daysAhead = (6 - dow + 7) % 7;    // 0 when it's already Saturday
    const target = new Date(r.getTime() + daysAhead * DAY_MS);
    const y = target.getUTCFullYear();
    const m = String(target.getUTCMonth() + 1).padStart(2, "0");
    const d = String(target.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** "السبت 15 أغسطس 2026" from a YYYY-MM-DD key. */
export function saturdayLabel(key: string): string {
    const [y, m, d] = key.split("-").map(Number);
    if (!y || !m || !d) return key;
    return `السبت ${d} ${AR_MONTHS[m - 1]} ${y}`;
}

/** Validates "HH:MM" (24h) — the time a member says they'll show up. */
export function isValidTime(v: unknown): v is string {
    return typeof v === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

/** "19:30" → "٧:٣٠ م" for display. */
export function formatTime(hhmm: string): string {
    if (!isValidTime(hhmm)) return hhmm;
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "م" : "ص";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export interface SaturdayResponse {
    coming: boolean;
    time: string | null;   // HH:MM — when THIS member will arrive
    atMs: number;
}

export interface SaturdayOuting {
    key: string;                                  // YYYY-MM-DD of the Saturday
    status: "open" | "cancelled";
    responses: Record<string, SaturdayResponse>;
    note: string;                                 // written documentation, added after
    createdAtMs: number;
}

export interface SaturdayState {
    hasAccess: boolean;
    isSaturdayDean: boolean;
    allowedMembers: string[];
    constitution: string;
    introSeen: boolean;
    current: SaturdayOuting | null;
    history: SaturdayOuting[];
}

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "مين الملك الجاي؟"
 * قال: "اللي بعد الحالي بالترتيب... إلا إذا عدّلت أنت، وقتها أسمع كلامك زي الموظف المثالي 😂👑"
 *
 * منطق دورة حياة الأسبوع (سيرفر فقط، adminDb). مشترك بين RPC "startNewWeek" اليدوي
 * والأتمتة — مصدر واحد للحقيقة عشان الأتمتة تمشي على نفس الوضع الحالي بدون اختلاف.
 */

import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

const Timestamp = admin.firestore.Timestamp;

// Kept in sync with VALID_NAMES in services.ts (duplicated here to keep this a
// pure server module without pulling in the client Firebase SDK).
export const KING_ORDER = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];

/**
 * Next king in the rotation, derived from the CURRENT week's king — so a manual
 * dean edit to the current king is respected automatically. Mirrors the dean's
 * manual "start new week" logic exactly:
 *   ... → 6th person → random week → 1st person (new cycle) → ...
 */
export function nextKingFor(currentWeek: { king?: string | null; isRandom?: boolean } | null): { kingName: string | null; isRandom: boolean } {
    if (currentWeek && !currentWeek.isRandom) {
        const idx = KING_ORDER.indexOf(currentWeek.king || "");
        if (idx === KING_ORDER.length - 1) return { kingName: null, isRandom: true }; // after the 6th → random
        if (idx !== -1) return { kingName: KING_ORDER[idx + 1], isRandom: false };
    } else if (currentWeek && currentWeek.isRandom) {
        return { kingName: KING_ORDER[0], isRandom: false }; // after random → restart cycle
    }
    return { kingName: KING_ORDER[0], isRandom: false };
}

/**
 * Create the next pending week. Server owns cycle + week numbering (auto-advances
 * the cycle after a random week, computes a clean weekNumber, retires stale pending
 * weeks). This is the EXACT logic the manual RPC used — extracted verbatim.
 */
export async function createNextWeek(kingName: string | null, isRandom: boolean): Promise<any> {
    const cfgSnap = await adminDb.collection("appConfig").doc("main").get();
    let configuredCycle = Number(cfgSnap.exists ? (cfgSnap.data() as { currentCycle?: number } | undefined)?.currentCycle : undefined);
    if (!Number.isInteger(configuredCycle) || configuredCycle <= 0) configuredCycle = 1;

    const allWeeksSnap = await adminDb.collection("weeks").get();
    let maxWeek = 0;
    const stalePending: FirebaseFirestore.DocumentReference[] = [];
    let newestCompleted: { ref: FirebaseFirestore.DocumentReference; isRandom: boolean; ms: number } | null = null;
    allWeeksSnap.forEach((d) => {
        const w = d.data() as { weekNumber?: number; status?: string; isRandom?: boolean; createdAt?: FirebaseFirestore.Timestamp };
        const wn = Number(w?.weekNumber ?? 0);
        if (Number.isInteger(wn) && wn < 900 && wn > maxWeek) maxWeek = wn;
        if (w?.status === "pending") stalePending.push(d.ref);
        if (w?.status === "completed") {
            const ms = w.createdAt?.toMillis?.() ?? 0;
            if (!newestCompleted || ms > newestCompleted.ms) {
                newestCompleted = { ref: d.ref, isRandom: Boolean(w.isRandom), ms };
            }
        }
    });
    const weekNumber = maxWeek + 1;

    let cycleNumber = configuredCycle;
    if (newestCompleted && (newestCompleted as { isRandom: boolean }).isRandom && !isRandom) {
        cycleNumber = configuredCycle + 1;
        await adminDb.collection("appConfig").doc("main").set(
            { currentCycle: cycleNumber, updatedAt: Timestamp.now() },
            { merge: true },
        );
    }

    if (stalePending.length > 0) {
        const retireBatch = adminDb.batch();
        stalePending.forEach((ref) => retireBatch.update(ref, { status: "skipped" }));
        await retireBatch.commit();
    }

    const newWeekRef = adminDb.collection("weeks").doc();
    const newWeek = {
        king: kingName,
        isRandom,
        cycleNumber,
        weekNumber,
        day: null,
        dayVotingEnabled: true,
        dayVotes: {},
        restaurant: null,
        activity: null,
        status: "pending",
        ratingEnabled: false,
        absentees: [],
        responded: [],
        createdAt: Timestamp.now(),
    };
    await newWeekRef.set(newWeek);
    return { id: newWeekRef.id, ...newWeek };
}

/**
 * Days elapsed (Riyadh) since THIS week's outing day (خميس/جمعة), anchored to the
 * week's createdAt so it never confuses "before the outing" with "a week after".
 * Negative if the outing hasn't happened yet. Correctly distinguishes Thu vs Fri.
 */
const DAY_IDX: Record<string, number> = {
    "الأحد": 0, "الإثنين": 1, "الاثنين": 1, "الثلاثاء": 2, "الأربعاء": 3, "الخميس": 4, "الجمعة": 5, "السبت": 6,
};
export function daysSinceOuting(createdAtMs: number, day: string | null | undefined): number | null {
    if (!day || !(day in DAY_IDX)) return null;
    const RIYADH = 3 * 60 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const target = DAY_IDX[day];
    const createdWeekday = new Date(createdAtMs + RIYADH).getUTCDay();
    const forward = (target - createdWeekday + 7) % 7; // days from week-start to the outing
    const outingMs = createdAtMs + forward * DAY_MS;
    return (Date.now() - outingMs) / DAY_MS;
}

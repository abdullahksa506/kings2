/**
 * King AI Brain — daily per-user rate limit.
 * Stored in Firestore: aiUsage/{userName}_{YYYY-MM-DD}
 */

import { adminDb } from "./firebase-admin";

export const DAILY_LIMIT = 20;
export const DEAN_DAILY_LIMIT = 100;

function todayKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export async function checkAndIncrement(
    userName: string,
    isDean = false,
): Promise<{ allowed: boolean; used: number; limit: number }> {
    const limit = isDean ? DEAN_DAILY_LIMIT : DAILY_LIMIT;
    const docId = `${userName}_${todayKey()}`;
    const ref = adminDb.collection("aiUsage").doc(docId);

    return adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = (snap.exists ? (snap.data() as { count?: number } | undefined)?.count ?? 0 : 0);
        if (current >= limit) {
            return { allowed: false, used: current, limit };
        }
        tx.set(ref, { count: current + 1, userName, date: todayKey(), updatedAt: new Date() }, { merge: true });
        return { allowed: true, used: current + 1, limit };
    });
}

export async function getUsage(userName: string): Promise<{ used: number; limit: number; isDean: boolean }> {
    const docId = `${userName}_${todayKey()}`;
    const snap = await adminDb.collection("aiUsage").doc(docId).get();
    const used = snap.exists ? (snap.data() as { count?: number } | undefined)?.count ?? 0 : 0;
    return { used, limit: DAILY_LIMIT, isDean: false };
}

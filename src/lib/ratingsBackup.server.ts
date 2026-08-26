/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تاخذ نسخة احتياطية قبل كل شي؟"
 * قال: "لأني شفت مبرمجين يبكون... وما ودّي أكون السبب 😂💾"
 * قالوا: "وإذا الأصدقاء تحاربوا بالتقييمات؟" قال: "زر واحد وأرجّع الزمن — Ctrl+Z للحياة ⏪"
 */

/**
 * 💾 نسخ احتياطية للتقييمات — نسخة كاملة تُحفظ بضغطة زر وتُسترجع بضغطة زر.
 *
 * البنية: ratingsBackups/{backupId}          → بيانات النسخة (وقت، منشئ، عدد)
 *         ratingsBackups/{backupId}/items/*  → صور طبق الأصل من مستندات ratings
 *
 * الاسترجاع يمسح `ratings` بالكامل ويعيد بناءها من النسخة — بنفس المعرّفات،
 * فالنتيجة مطابقة تماماً للحظة أخذ النسخة.
 *
 * 🔒 المجموعة مقفلة على العميل عبر الـ catch-all في firestore.rules، وكل شي
 *    يمر عبر RPC للعميد فقط.
 * 🗑️ للحذف الكامل: REMOVED_FEATURES.md — قسم «النسخ الاحتياطية للتقييمات».
 */

import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

const Timestamp = admin.firestore.Timestamp;

const RATINGS = "ratings";
const BACKUPS = "ratingsBackups";
const BATCH_LIMIT = 450; // حد Firestore 500 — نترك هامش أمان

export type BackupMeta = {
    id: string;
    label: string;
    createdAt: number | null;
    createdBy: string | null;
    count: number;
    auto: boolean;
};

/** حذف كل مستندات مرجع مجموعة على دفعات. */
async function wipeCollection(ref: admin.firestore.CollectionReference | admin.firestore.Query): Promise<number> {
    let total = 0;
    for (;;) {
        const snap = await ref.limit(BATCH_LIMIT).get();
        if (snap.empty) break;
        const batch = adminDb.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        total += snap.size;
        if (snap.size < BATCH_LIMIT) break;
    }
    return total;
}

/** أخذ نسخة كاملة من التقييمات الحالية. */
export async function createBackup(dean: string, label: string, auto = false): Promise<BackupMeta> {
    const snap = await adminDb.collection(RATINGS).get();
    const backupRef = adminDb.collection(BACKUPS).doc();

    let batch = adminDb.batch();
    let inBatch = 0;
    for (const d of snap.docs) {
        batch.set(backupRef.collection("items").doc(d.id), d.data());
        if (++inBatch >= BATCH_LIMIT) { await batch.commit(); batch = adminDb.batch(); inBatch = 0; }
    }
    if (inBatch > 0) await batch.commit();

    // بيانات النسخة تُكتب أخيراً — لو فشل النسخ ما تظهر نسخة ناقصة في القائمة.
    const meta = {
        label: label.slice(0, 80) || "نسخة",
        createdAt: Timestamp.now(),
        createdBy: dean,
        count: snap.size,
        auto,
    };
    await backupRef.set(meta);
    return { id: backupRef.id, label: meta.label, createdAt: meta.createdAt.toMillis(), createdBy: dean, count: snap.size, auto };
}

/** قائمة النسخ — الأحدث أولاً. */
export async function listBackups(): Promise<BackupMeta[]> {
    const snap = await adminDb.collection(BACKUPS).get();
    return snap.docs
        .map((d) => {
            const v = d.data() as { label?: string; createdAt?: admin.firestore.Timestamp; createdBy?: string; count?: number; auto?: boolean };
            return {
                id: d.id,
                label: typeof v.label === "string" ? v.label : "نسخة",
                createdAt: v.createdAt?.toMillis?.() ?? null,
                createdBy: typeof v.createdBy === "string" ? v.createdBy : null,
                count: Number(v.count ?? 0),
                auto: Boolean(v.auto),
            };
        })
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

/**
 * استرجاع نسخة: يمسح التقييمات الحالية ويعيد بناءها من النسخة.
 * يأخذ نسخة تلقائية من الوضع الحالي أولاً — عشان الاسترجاع الغلط يكون قابل للتراجع.
 */
export async function restoreBackup(id: string, dean: string): Promise<{ restored: number; safetyBackupId: string }> {
    const backupRef = adminDb.collection(BACKUPS).doc(id);
    const metaSnap = await backupRef.get();
    if (!metaSnap.exists) throw new Error("النسخة غير موجودة");

    const items = await backupRef.collection("items").get();
    if (items.empty) throw new Error("النسخة فاضية — لن نمسح التقييمات الحالية");

    // شبكة أمان: نحفظ الوضع الحالي قبل ما نلمسه.
    const safety = await createBackup(dean, "تلقائية قبل الاسترجاع", true);

    await wipeCollection(adminDb.collection(RATINGS));

    let batch = adminDb.batch();
    let inBatch = 0;
    for (const d of items.docs) {
        batch.set(adminDb.collection(RATINGS).doc(d.id), d.data());
        if (++inBatch >= BATCH_LIMIT) { await batch.commit(); batch = adminDb.batch(); inBatch = 0; }
    }
    if (inBatch > 0) await batch.commit();

    return { restored: items.size, safetyBackupId: safety.id };
}

/** حذف نسخة (مع محتوياتها). */
export async function deleteBackup(id: string): Promise<{ deleted: number }> {
    const backupRef = adminDb.collection(BACKUPS).doc(id);
    const deleted = await wipeCollection(backupRef.collection("items"));
    await backupRef.delete();
    return { deleted };
}

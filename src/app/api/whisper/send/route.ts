import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";
import { Timestamp } from "firebase-admin/firestore";

const VALID_NAMES = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const MAX_MESSAGE = 200;

/**
 * Whisper system — any member can send a push to chosen recipients, but only
 * ONCE every 30 minutes. The rate limit is enforced SERVER-SIDE inside a
 * Firestore transaction, so opening F12 and calling this endpoint directly
 * can't bypass it: the slot is atomically reserved before any push is sent.
 */
export async function POST(request: Request) {
    // Any authenticated member (no role restriction).
    const auth = await authenticateServerRequest(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const sender = auth.user.name;
    if (!VALID_NAMES.includes(sender)) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // Parse + validate input
    let body: { recipients?: unknown; message?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }
    const message = String(body?.message ?? "").trim();
    if (!message) return NextResponse.json({ error: "اكتب رسالة." }, { status: 400 });
    if (message.length > MAX_MESSAGE) {
        return NextResponse.json({ error: `الرسالة طويلة (${message.length}/${MAX_MESSAGE}).` }, { status: 400 });
    }
    const recipients = Array.isArray(body?.recipients)
        ? [...new Set((body.recipients as unknown[]).map((r) => String(r)).filter((r) => VALID_NAMES.includes(r)))]
        : [];
    if (recipients.length === 0) {
        return NextResponse.json({ error: "اختر مستلم واحد على الأقل." }, { status: 400 });
    }

    // ── Server-side rate limit (atomic reserve-before-send) ──
    const limitRef = adminDb.collection("whisperLimits").doc(sender);
    const now = Date.now();
    try {
        await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(limitRef);
            const lastMs = snap.exists ? Number((snap.data() as { lastSentMs?: number } | undefined)?.lastSentMs ?? 0) : 0;
            const elapsed = now - lastMs;
            if (lastMs > 0 && elapsed < COOLDOWN_MS) {
                const waitMs = COOLDOWN_MS - elapsed;
                // Throw a typed error we catch below to return 429.
                throw Object.assign(new Error("cooldown"), { code: "COOLDOWN", waitMs });
            }
            // Reserve the slot NOW so concurrent/F12 calls can't slip through.
            tx.set(limitRef, { lastSentMs: now, sender, updatedAt: Timestamp.now() }, { merge: true });
        });
    } catch (e: unknown) {
        const err = e as { code?: string; waitMs?: number };
        if (err?.code === "COOLDOWN") {
            const mins = Math.ceil((err.waitMs ?? 0) / 60000);
            return NextResponse.json(
                { error: `لسا ما مرّت النص ساعة. تقدر تهمس بعد ${mins} دقيقة ⏳`, waitMs: err.waitMs, cooldown: true },
                { status: 429 },
            );
        }
        console.error("whisper limit tx error", e);
        return NextResponse.json({ error: "خطأ في فحص الحد." }, { status: 500 });
    }

    // ── Send the push ──
    try {
        const result = await sendPushNotification(
            {
                title: `🤫 همسة من ${sender}`,
                body: message,
                type: "default",
                tag: `whisper-${now}`,
                url: "/",
            },
            { userNames: recipients },
        );
        // Log the whisper (for the dean to audit abuse).
        try {
            await adminDb.collection("whisperLog").add({
                sender,
                recipients,
                message,
                sentCount: result.sentCount,
                createdAt: Timestamp.now(),
            });
        } catch { /* logging is best-effort */ }

        return NextResponse.json({
            success: true,
            sentCount: result.sentCount,
            failedCount: result.failedCount,
            message: `تم إرسال الهمسة لـ ${result.sentCount} شخص 🤫`,
            nextAvailableMs: now + COOLDOWN_MS,
        });
    } catch (e) {
        console.error("whisper send error", e);
        // Note: the slot is already reserved; sender waits 30 min even on a
        // rare send failure. This is intentional to keep the limit abuse-proof.
        return NextResponse.json({ error: "ما قدرنا نرسل الهمسة." }, { status: 500 });
    }
}

// GET — returns the sender's remaining cooldown so the UI can show a countdown.
export async function GET(request: Request) {
    const auth = await authenticateServerRequest(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const sender = auth.user.name;
    const snap = await adminDb.collection("whisperLimits").doc(sender).get();
    const lastMs = snap.exists ? Number((snap.data() as { lastSentMs?: number } | undefined)?.lastSentMs ?? 0) : 0;
    const elapsed = Date.now() - lastMs;
    const remainingMs = lastMs > 0 && elapsed < COOLDOWN_MS ? COOLDOWN_MS - elapsed : 0;
    return NextResponse.json({ remainingMs, cooldownMs: COOLDOWN_MS });
}

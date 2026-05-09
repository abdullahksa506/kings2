import { NextResponse } from "next/server";
import { services, VALID_NAMES } from "@/lib/services";
import { adminDb } from "@/lib/firebase-admin";
import { sendPushNotification } from "@/lib/pushHelper";
import * as admin from "firebase-admin";

/**
 * Cron endpoint: hit me every hour from a free service like cron-job.org.
 *
 * Authentication: requires header `x-cron-secret` matching env CRON_SECRET.
 *
 * Decisions are taken from the current week state + Riyadh local time, and
 * each rule is idempotent via a Firestore document under
 * `cronReminderState/{ruleId}` storing the last-sent timestamp so we never
 * spam the same reminder twice in the same window.
 *
 * Riyadh is UTC+3 (no DST).
 */

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

function riyadhNow(): { date: Date; hour: number; dayName: string } {
    const now = new Date(Date.now() + RIYADH_OFFSET_MS);
    const hour = now.getUTCHours(); // because we shifted manually
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const dayName = days[now.getUTCDay()];
    return { date: now, hour, dayName };
}

async function shouldRunRule(ruleId: string, intervalMinutes: number): Promise<boolean> {
    const ref = adminDb.collection("cronReminderState").doc(ruleId);
    const snap = await ref.get();
    const now = Date.now();
    if (snap.exists) {
        const lastRunAt = (snap.data() as any)?.lastRunAt;
        if (lastRunAt) {
            const lastMs =
                lastRunAt?.toMillis ? lastRunAt.toMillis() : new Date(lastRunAt).getTime();
            if (now - lastMs < intervalMinutes * 60 * 1000) {
                return false;
            }
        }
    }
    await ref.set({ lastRunAt: admin.firestore.Timestamp.now() }, { merge: true });
    return true;
}

export async function POST(request: Request) {
    return handle(request);
}

export async function GET(request: Request) {
    return handle(request);
}

async function handle(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json(
            { error: "CRON_SECRET not configured on server" },
            { status: 500 }
        );
    }

    const provided = request.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hour, dayName } = riyadhNow();

    // Quiet hours: do not send between 11pm and 8am Riyadh time.
    if (hour < 8 || hour >= 23) {
        return NextResponse.json({ ok: true, skipped: "quiet-hours", hour });
    }

    const week = await services.getCurrentWeek();
    if (!week) {
        return NextResponse.json({ ok: true, skipped: "no-active-week" });
    }

    const log: Array<{ rule: string; sent: number; skipped?: string }> = [];

    // Rule 1: Wednesday 8pm-9pm window — remind king if no decision yet.
    if (
        dayName === "الأربعاء" &&
        hour >= 20 &&
        hour < 22 &&
        week.king &&
        (!week.day || !week.restaurant)
    ) {
        const ruleId = `wed-king-decision-${week.id}`;
        if (await shouldRunRule(ruleId, 24 * 60)) {
            const r = await sendPushNotification(
                {
                    title: "يا ملكنا 👑 ينقصنا قرارك!",
                    body: "آخر فرصة قبل 10م. حدد اليوم والمطعم عشان نتحرك.",
                    type: "king-decision",
                    tag: `king-decision-${week.id}`,
                    url: "/?action=king-decisions",
                    payload: { weekId: week.id },
                },
                { userNames: [week.king] }
            );
            log.push({ rule: ruleId, sent: r.sentCount });
        } else {
            log.push({ rule: ruleId, sent: 0, skipped: "already-sent" });
        }
    }

    // Rule 2: Wednesday 9pm — remind unresponded members about attendance.
    if (
        dayName === "الأربعاء" &&
        hour >= 21 &&
        hour < 23
    ) {
        const responded = new Set(week.responded || []);
        const targets = VALID_NAMES.filter(
            (name) => name !== week.king && !responded.has(name)
        );
        if (targets.length > 0) {
            const ruleId = `wed-attendance-pending-${week.id}`;
            if (await shouldRunRule(ruleId, 24 * 60)) {
                const r = await sendPushNotification(
                    {
                        title: "أكد حضورك! ⏳",
                        body: "بكرا الطلعة (إن شاء الله) — أكد حضورك أو اعتذارك.",
                        type: "attendance-pending",
                        tag: `attendance-pending-${week.id}`,
                        url: "/?action=open-attendance",
                        payload: { weekId: week.id },
                    },
                    { userNames: targets }
                );
                log.push({ rule: ruleId, sent: r.sentCount });
            }
        }
    }

    // Rule 3: Outing day at 10am — "اليوم يوم الطلعة".
    if (
        week.day === dayName &&
        hour >= 10 &&
        hour < 12
    ) {
        const absentees = new Set(week.absentees || []);
        const targets = VALID_NAMES.filter((name) => !absentees.has(name));
        if (targets.length > 0) {
            const ruleId = `outing-today-${week.id}`;
            if (await shouldRunRule(ruleId, 24 * 60)) {
                const r = await sendPushNotification(
                    {
                        title: "اليوم يوم الطلعة! 🎉",
                        body: week.restaurant
                            ? `الطلعة اليوم في "${week.restaurant}". لا تتأخر!`
                            : "الطلعة اليوم. لا تتأخر!",
                        type: "outing-today",
                        tag: `outing-today-${week.id}`,
                        url: "/?tab=week",
                        payload: { weekId: week.id, restaurant: week.restaurant },
                    },
                    { userNames: targets }
                );
                log.push({ rule: ruleId, sent: r.sentCount });
            }
        }
    }

    // Rule 4: Day after outing at 7pm — remind to rate (if rating is enabled).
    const dayAfterMap: Record<string, string> = {
        "السبت": "الأحد",
        "الأحد": "الإثنين",
        "الإثنين": "الثلاثاء",
        "الثلاثاء": "الأربعاء",
        "الأربعاء": "الخميس",
        "الخميس": "الجمعة",
        "الجمعة": "السبت",
    };
    if (
        week.ratingEnabled &&
        week.day &&
        dayAfterMap[week.day] === dayName &&
        hour >= 19 &&
        hour < 21
    ) {
        const absentees = new Set(week.absentees || []);
        const candidates = VALID_NAMES.filter(
            (name) => name !== week.king && !absentees.has(name)
        );
        const targets: string[] = [];
        for (const name of candidates) {
            const hasRated = await services.hasUserRated(week.id, name);
            if (!hasRated) targets.push(name);
        }
        if (targets.length > 0) {
            const ruleId = `rating-reminder-${week.id}`;
            if (await shouldRunRule(ruleId, 24 * 60)) {
                const r = await sendPushNotification(
                    {
                        title: "ما قيّمت بعد! ⭐",
                        body: `لا تنسى تقيّم "${week.restaurant || "الطلعة"}". تقييمك سري.`,
                        type: "rating-unlocked",
                        tag: `rating-reminder-${week.id}`,
                        url: "/?action=rate",
                        payload: { weekId: week.id },
                    },
                    { userNames: targets }
                );
                log.push({ rule: ruleId, sent: r.sentCount });
            }
        }
    }

    return NextResponse.json({
        ok: true,
        riyadhHour: hour,
        dayName,
        log,
    });
}

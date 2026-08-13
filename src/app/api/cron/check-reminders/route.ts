import { NextResponse } from "next/server";
import { services, VALID_NAMES } from "@/lib/services";
import { adminDb } from "@/lib/firebase-admin";
import { sendPushNotification } from "@/lib/pushHelper";
import * as admin from "firebase-admin";
import { AutomationConfig, DEFAULT_AUTOMATION, mergeAutomation } from "@/lib/automation";
import { createNextWeek, nextKingFor, daysSinceOuting } from "@/lib/weekLifecycle.server";
import { SATURDAY_DEAN, currentSaturdayKey } from "@/lib/saturday";

/** Master automation config: stored doc merged over code defaults (default OFF). */
async function getAutomationConfig(): Promise<AutomationConfig> {
    try {
        const snap = await adminDb.collection("appConfig").doc("automation").get();
        return mergeAutomation(snap.exists ? snap.data() : {});
    } catch {
        return DEFAULT_AUTOMATION;
    }
}

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

    // ── MASTER SWITCH ── everything below is dormant until the dean enables it.
    const cfg = await getAutomationConfig();
    if (!cfg.enabled) {
        return NextResponse.json({ ok: true, skipped: "automation-disabled" });
    }
    const R = cfg.rules;

    const { hour, dayName } = riyadhNow();

    // Quiet hours: do not send between 11pm and 8am Riyadh time.
    if (hour < 8 || hour >= 23) {
        return NextResponse.json({ ok: true, skipped: "quiet-hours", hour });
    }

    const log: Array<{ rule: string; sent: number; skipped?: string }> = [];

    // ── طلعة السبت: تنبيه الجمعة العصر ──
    // Runs BEFORE the Thursday-week check on purpose: the Saturday outing is a
    // separate track and must fire even when no Thursday week is active.
    if (
        R.saturdayRsvp?.on &&
        dayName === (R.saturdayRsvp.day ?? "الجمعة") &&
        hour >= (R.saturdayRsvp.hourFrom ?? 16) &&
        hour < (R.saturdayRsvp.hourTo ?? 18)
    ) {
        const satKey = currentSaturdayKey();
        const ruleId = `saturday-rsvp-${satKey}`;
        if (await shouldRunRule(ruleId, 24 * 60)) {
            const cfgSnap = await adminDb.collection("saturdayConfig").doc("main").get();
            const allowed = (cfgSnap.exists ? (cfgSnap.data()?.allowedMembers as string[]) : []) || [];
            const targets = Array.from(new Set([SATURDAY_DEAN, ...allowed]));
            const r = await sendPushNotification(
                {
                    title: "🤫 طلعة السبت — حدد موقفك",
                    body: "بتجي ولا لا؟ وإذا بتجي، الساعة كم توصل؟ افتح وحدد.",
                    type: "default",
                    tag: `saturday-rsvp-${satKey}`,
                    url: "/saturday",
                    payload: { key: satKey },
                },
                { userNames: targets },
            );
            log.push({ rule: ruleId, sent: r.sentCount });
        }
    }

    const week = await services.getCurrentWeek();
    if (!week) {
        return NextResponse.json({ ok: true, skipped: "no-active-week", log });
    }

    // Rule 1: remind king if no decision yet (default Wed 8-10pm).
    if (
        R.kingDecision.on &&
        dayName === R.kingDecision.day &&
        hour >= (R.kingDecision.hourFrom ?? 20) &&
        hour < (R.kingDecision.hourTo ?? 22) &&
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

    // Rule 2: remind unresponded members about attendance (default Wed 9-11pm).
    if (
        R.attendancePending.on &&
        dayName === R.attendancePending.day &&
        hour >= (R.attendancePending.hourFrom ?? 21) &&
        hour < (R.attendancePending.hourTo ?? 23)
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

    // Rule 3: outing-day morning — "اليوم يوم الطلعة" (default 10am-12pm).
    if (
        R.outingMorning.on &&
        week.day === dayName &&
        hour >= (R.outingMorning.hourFrom ?? 10) &&
        hour < (R.outingMorning.hourTo ?? 12)
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
        R.ratingReminder.on &&
        week.ratingEnabled &&
        week.day &&
        dayAfterMap[week.day] === dayName &&
        hour >= (R.ratingReminder.hourFrom ?? 19) &&
        hour < (R.ratingReminder.hourTo ?? 21)
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

    // Rule 5: FINAL rating warning — louder, later window; only unrated attendees.
    if (
        R.ratingFinalWarning.on &&
        week.ratingEnabled &&
        week.day &&
        dayAfterMap[week.day] === dayName &&
        hour >= (R.ratingFinalWarning.hourFrom ?? 22) &&
        hour < (R.ratingFinalWarning.hourTo ?? 23)
    ) {
        const absentees = new Set(week.absentees || []);
        const candidates = VALID_NAMES.filter((name) => name !== week.king && !absentees.has(name));
        const targets: string[] = [];
        for (const name of candidates) {
            if (!(await services.hasUserRated(week.id, name))) targets.push(name);
        }
        if (targets.length > 0) {
            const ruleId = `rating-final-warning-${week.id}`;
            if (await shouldRunRule(ruleId, 24 * 60)) {
                const r = await sendPushNotification(
                    {
                        title: "⏰ آخر تنبيه! التقييم يقفل قريباً",
                        body: `آخر فرصة تقيّم "${week.restaurant || "الطلعة"}" — بعد شوي يقفل!`,
                        type: "rating-unlocked",
                        tag: `rating-final-warning-${week.id}`,
                        url: "/?action=rate",
                        payload: { weekId: week.id },
                    },
                    { userNames: targets }
                );
                log.push({ rule: ruleId, sent: r.sentCount });
            }
        }
    }

    // Rule 6: auto-close rating N hours after it opened (state change, reversible).
    const ratingOpenedAt = (week as any).ratingEnabledAt;
    if (R.autoCloseRating.on && week.ratingEnabled && ratingOpenedAt?.toMillis) {
        const hoursOpen = (Date.now() - ratingOpenedAt.toMillis()) / 3_600_000;
        if (hoursOpen >= (R.autoCloseRating.hoursAfterOpen ?? 48)) {
            const ruleId = `auto-close-rating-${week.id}`;
            if (await shouldRunRule(ruleId, 24 * 60)) {
                // Write directly via admin (client SDK writes are blocked by rules).
                await adminDb.collection("weeks").doc(week.id).update({ ratingEnabled: false });
                log.push({ rule: ruleId, sent: 0, skipped: "rating-closed" });
            }
        }
    }

    // Rule 7: auto-start the NEXT week once this outing is fully done.
    // Dean's rules: (1) only advance when the restaurant + day were actually chosen
    // (the outing happened), (2) only after the real outing day (خميس/جمعة) has passed
    // by N days — computed from createdAt so Thu/Fri never get confused, (3) rotation
    // follows the CURRENT king so any manual king edit is respected.
    if (
        R.autoAdvanceWeek.on &&
        week.status === "pending" &&
        week.restaurant &&
        week.day &&
        !week.isRandom // random weeks have no restaurant decision; dean handles them
    ) {
        const since = daysSinceOuting((week as any).createdAt?.toMillis?.() ?? 0, week.day);
        if (since !== null && since >= (R.autoAdvanceWeek.daysAfterOuting ?? 2)) {
            const ruleId = `auto-advance-${week.id}`;
            if (await shouldRunRule(ruleId, 24 * 60)) {
                await adminDb.collection("weeks").doc(week.id).update({ status: "completed" });
                const { kingName, isRandom } = nextKingFor(week);
                const created = await createNextWeek(kingName, isRandom);
                log.push({ rule: ruleId, sent: 0, skipped: `advanced→${kingName || "عشوائي"} (wk${created.weekNumber})` });
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

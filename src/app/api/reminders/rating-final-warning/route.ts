import { NextResponse } from "next/server";
import { services, VALID_NAMES } from "@/lib/services";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";

/**
 * Final-warning push for rating: sent only to attendees who have NOT yet
 * rated the active rating week. Loud copy + dedicated tag so it visually
 * stands out from the regular rating reminders.
 */
export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"], allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const minutesUntilClose = Number(body?.minutesUntilClose) > 0 ? Number(body.minutesUntilClose) : 30;

        const week = await services.getCurrentWeek();
        const pastWeek = await services.getPreviousWeek();

        // Target whichever week currently has rating enabled.
        const targetWeek =
            (week && week.ratingEnabled) ? week :
            (pastWeek && pastWeek.ratingEnabled) ? pastWeek :
            null;

        if (!targetWeek) {
            return NextResponse.json(
                { message: "ما فيه أسبوع تقييمه مفتوح حالياً." },
                { status: 400 }
            );
        }

        const absentees = new Set(targetWeek.absentees || []);
        const candidates = VALID_NAMES.filter(
            (name) => name !== targetWeek.king && !absentees.has(name)
        );

        const targets: string[] = [];
        for (const name of candidates) {
            const hasRated = await services.hasUserRated(targetWeek.id, name);
            if (!hasRated) targets.push(name);
        }

        if (targets.length === 0) {
            return NextResponse.json({
                success: true,
                message: "كل الحاضرين قيّموا — مافي أحد لتنبيهه.",
                sentCount: 0,
            });
        }

        const result = await sendPushNotification(
            {
                title: "⚠️ تنبيه أخير! التقييم بيقفل",
                body: `باقي ${minutesUntilClose} دقيقة بس على إقفال التقييم${targetWeek.restaurant ? ` لمطعم "${targetWeek.restaurant}"` : ""}. قيّم الآن قبل ما يفوتك!`,
                type: "rating-unlocked",
                tag: `rating-final-warning-${targetWeek.id}`,
                url: "/?action=rate",
                payload: { weekId: targetWeek.id, finalWarning: true, minutesUntilClose },
            },
            { userNames: targets }
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال التنبيه الأخير لـ ${result.sentCount} عضو لم يقيّم بعد.`,
            sentCount: result.sentCount,
            failedCount: result.failedCount,
            targets,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

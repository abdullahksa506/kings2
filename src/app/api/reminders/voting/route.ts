import { NextResponse } from "next/server";
import { services, VALID_NAMES } from "@/lib/services";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";

export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"], allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const week = await services.getCurrentWeek();
        if (!week) {
            return NextResponse.json({ message: "No active week to rate." });
        }

        const absentees = new Set(week.absentees || []);
        const candidates = VALID_NAMES.filter(
            (name) => name !== week.king && !absentees.has(name)
        );

        const targets: string[] = [];
        for (const name of candidates) {
            const hasRated = await services.hasUserRated(week.id, name);
            if (!hasRated) targets.push(name);
        }

        if (targets.length === 0) {
            return NextResponse.json({ success: true, message: "كل الحاضرين قيّموا." });
        }

        const result = await sendPushNotification(
            {
                title: "تذكير: قيّم الطلعة ⭐",
                body: `لا تنسى تقيّم مطعم "${week.restaurant || "هذا الأسبوع"}". تقييمك السري يحسم النتائج!`,
                type: "rating-unlocked",
                tag: `voting-${week.id}`,
                url: "/?action=rate",
                payload: { weekId: week.id },
            },
            { userNames: targets }
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال تذكير التقييم لـ ${result.sentCount} عضو.`,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

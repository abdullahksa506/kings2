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
        const body = await request.json();
        const { weekId } = body;

        if (!weekId) {
            return NextResponse.json({ error: "Missing weekId" }, { status: 400 });
        }

        const week = await services.getCurrentWeek();
        const pastWeek = await services.getPreviousWeek();
        const targetWeek = (week && week.id === weekId) ? week : ((pastWeek && pastWeek.id === weekId) ? pastWeek : null);

        if (!targetWeek) {
            return NextResponse.json({ message: "Week not found." }, { status: 400 });
        }

        const absentees = new Set(targetWeek.absentees || []);
        const targets = VALID_NAMES.filter(
            (name) => name !== targetWeek.king && !absentees.has(name)
        );

        const result = await sendPushNotification(
            {
                title: "التصويت متاح الآن! ⭐",
                body: `تم فتح تقييم "${targetWeek.restaurant || "هذا الأسبوع"}". خذ ثانيتين وقيّم.`,
                type: "rating-unlocked",
                tag: `rating-unlocked-${weekId}`,
                url: "/?action=rate",
                payload: { weekId },
            },
            { userNames: targets }
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال تنبيه التقييم لـ ${result.sentCount} عضو.`,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

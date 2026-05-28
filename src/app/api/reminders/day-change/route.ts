import { NextResponse } from "next/server";
import { services, VALID_NAMES } from "@/lib/services";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";

export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, { allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const { weekId, newDay, changedBy } = body;

        if (!weekId || !newDay) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const week = await services.getCurrentWeek();
        if (!week || week.id !== weekId) {
            return NextResponse.json({ message: "Week not active or mismatch." }, { status: 400 });
        }

        const isAllowedCaller = auth.user.viaAdminKey || auth.user.role === "dean" || auth.user.name === week.king;
        if (!isAllowedCaller) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // A day change can flip who is able to attend, so notify everyone (incl. absentees).
        const targets = VALID_NAMES.filter((name) => name !== changedBy);

        const result = await sendPushNotification(
            {
                title: "تغيير يوم الطلعة 📅",
                body: `${changedBy || "العميد"} غيّر يوم الطلعة إلى "${newDay}". عدّلوا حساباتكم!`,
                type: "day-change",
                tag: `day-change-${weekId}`,
                url: "/?tab=week",
                payload: { weekId, newDay },
            },
            { userNames: targets }
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال إشعار تغيير اليوم لـ ${result.sentCount} عضو.`,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

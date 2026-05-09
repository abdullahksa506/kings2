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
        const { weekId } = body;

        if (!weekId) {
            return NextResponse.json({ error: "Missing weekId" }, { status: 400 });
        }

        const week = await services.getCurrentWeek();
        if (!week || week.id !== weekId) {
            return NextResponse.json({ message: "Week not active or mismatch." }, { status: 400 });
        }

        const isAllowedCaller = auth.user.viaAdminKey || auth.user.role === "dean" || auth.user.name === week.king;
        if (!isAllowedCaller) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!week.restaurant || !week.day) {
            return NextResponse.json({ message: "Restaurant or day not fully decided yet." }, { status: 400 });
        }

        const absentees = new Set(week.absentees || []);
        const targets = VALID_NAMES.filter((name) => !absentees.has(name));

        const result = await sendPushNotification(
            {
                title: "تم تحديد الطلعة! 👑",
                body: `الملك ${week.king} اختار يوم ${week.day} في "${week.restaurant}". استعدوا!`,
                type: "voting",
                tag: `decision-${weekId}`,
                url: "/?tab=week",
                payload: { weekId, day: week.day, restaurant: week.restaurant },
            },
            { userNames: targets }
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال إشعار القرار لـ ${result.sentCount} عضو.`,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

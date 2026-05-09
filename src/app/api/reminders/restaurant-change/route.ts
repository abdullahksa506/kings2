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
        const { weekId, kingName, newRestaurant } = body;

        if (!weekId || !kingName || !newRestaurant) {
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

        const absentees = new Set(week.absentees || []);
        const targets = VALID_NAMES.filter((name) => !absentees.has(name));

        const result = await sendPushNotification(
            {
                title: "ملك الخميس قحبة! 😈",
                body: `${kingName} غير المطعم إلى "${newRestaurant}". القحبة ما يثبت على قرار!`,
                type: "restaurant-change",
                tag: `restaurant-change-${weekId}`,
                url: "/?tab=week",
                payload: { weekId, newRestaurant, kingName },
            },
            { userNames: targets }
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال إشعار تغيير المطعم لـ ${result.sentCount} عضو.`,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

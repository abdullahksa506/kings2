import { NextResponse } from "next/server";
import { services } from "@/lib/services";
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

        if (week.restaurant && week.day) {
            return NextResponse.json({ message: "King has already made choices." });
        }

        if (!week.king) {
            return NextResponse.json({ message: "No king set for this week." }, { status: 400 });
        }

        const result = await sendPushNotification(
            {
                title: "يا ملكنا 👑 ننتظر قرارك!",
                body: "ننتظر قرارك بخصوص يوم الطلعة والمطعم 🍔 لا تتأخر علينا!",
                type: "king-decision",
                tag: `king-decision-${weekId}`,
                url: "/?action=king-decisions",
                payload: { weekId },
            },
            { userNames: [week.king] }
        );

        if (result.sentCount === 0) {
            return NextResponse.json({
                message: "King has no active push subscription.",
                noSub: true
            }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Notification sent to King ${week.king}.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

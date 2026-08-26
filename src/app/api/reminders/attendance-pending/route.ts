import { NextResponse } from "next/server";
import { services, VALID_NAMES } from "@/lib/services";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";

export async function POST(request: Request) {
    // العميد أو ملك الأسبوع الحالي. الملك يحتاجها في وضع الصيانة عشان ينبّه
    // الشلة يحددون. التحقق من هوية الملك يصير بعد ما نجيب الأسبوع تحت.
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

        const isAllowedCaller =
            auth.user.viaAdminKey || auth.user.role === "dean" || auth.user.name === week.king;
        if (!isAllowedCaller) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const responded = new Set(week.responded || []);
        const targets = VALID_NAMES.filter(
            (name) => name !== week.king && !responded.has(name)
        );

        if (targets.length === 0) {
            return NextResponse.json({ success: true, message: "كل الأعضاء أكدوا حضورهم." });
        }

        const result = await sendPushNotification(
            {
                title: "أكد حضورك! ⏳",
                body: "ننتظر ردك بخصوص طلعة هذا الأسبوع. اضغط الإشعار وأكد حضورك أو اعتذارك.",
                type: "attendance-pending",
                tag: `attendance-pending-${weekId}`,
                url: "/?action=open-attendance",
                payload: { weekId },
            },
            { userNames: targets }
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال التنبيه لـ ${result.sentCount} عضو.`,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

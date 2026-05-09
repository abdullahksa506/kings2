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

        const absenteesCount = (week.absentees || []).length;
        const attendeesCount = VALID_NAMES.length - absenteesCount;

        const result = await sendPushNotification(
            {
                title: "اكتملت قائمة الحضور! 📋",
                body: `أكد الجميع حضورهم للطلعة القادمة!\n- الحاضرين: ${attendeesCount}\n- المعتذرين: ${absenteesCount}`,
                type: "attendance-complete",
                tag: `attendance-complete-${weekId}`,
                url: "/?tab=week",
                payload: { weekId, attendeesCount, absenteesCount },
            }
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال إشعار اكتمال الحضور لـ ${result.sentCount} عضو.`,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كيف تتأكد إن الإشعار وصل؟"
 * قال: "أرسله لنفسي... أنا الوحيد اللي ما يزعل من الإزعاج 😂🔔"
 *
 * إشعار تجريبي يرسله العضو لنفسه — للتأكد إن الإشعارات فعلاً تشتغل على جهازه
 * بعد إعادة تثبيت التطبيق. متاح لأي عضو مسجّل (مو للعميد فقط).
 */
export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const me = auth.user?.name;
    if (!me) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const result = await sendPushNotification(
            {
                title: "✅ الإشعارات تعمل!",
                body: "وصلك هذا الإشعار = كل شي تمام على جهازك 🎉",
                type: "default",
                tag: `self-test-${Date.now()}`,
                url: "/",
            },
            { userNames: [me] },
        );

        if (result.sentCount > 0) {
            return NextResponse.json({ success: true, status: "sent", sentCount: result.sentCount });
        }
        return NextResponse.json({
            success: false,
            status: "not_sent",
            reason: result.reason || "ما فيه اشتراك إشعارات مسجّل — فعّل الإشعارات أولاً",
        });
    } catch (e: unknown) {
        console.error("self-test push error", e);
        return NextResponse.json(
            { success: false, status: "error", error: e instanceof Error ? e.message : "خطأ غير متوقع" },
            { status: 500 },
        );
    }
}

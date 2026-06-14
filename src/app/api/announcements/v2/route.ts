import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";

/**
 * Dean-only endpoint that broadcasts the "ملك الخميس v2" release announcement
 * to every member's push subscription. Requires dean role.
 */
export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, {
        allowedRoles: ["dean"],
        allowAdminKey: true,
    });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await sendPushNotification({
        title: "🎉 ملك الخميس v2 نزل!",
        body:
            "تحديث جديد — ثيم TikTok مع ١٠٠ أغنية، خريطة مطاعم تفاعلية، تنسيق ذاتي للعشوائي، التيرمنال الحي، ١٦ ثيم شخصي، والمزيد. افتح الموقع جرّب 🚀",
        type: "default",
        tag: "v2-announcement",
        url: "/",
    });

    return NextResponse.json({
        success: true,
        message: `تم إرسال الإعلان لـ ${result.sentCount} عضو (فشل ${result.failedCount}).`,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        reason: result.reason,
    });
}

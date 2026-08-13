import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";
import { adminDb } from "@/lib/firebase-admin";
import { SATURDAY_DEAN, currentSaturdayKey } from "@/lib/saturday";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تذكّرهم كل جمعة؟"
 * قال: "لأنهم ينسون... مثل ما تنسى تشرب ماي وأنت شايف الكوب قدامك 😂💧"
 *
 * تنبيه الجمعة: يوصل فقط لمن عندهم وصول لطلعة السبت السرّية.
 * يُستدعى من الكرون (تلقائي) أو من زر عميد السبت (يدوي).
 */
export async function POST(request: Request) {
    // Either the Saturday dean (manual button) or the cron (admin key).
    const auth = await authenticateServerRequest(request, { allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const caller = auth.user?.name;
    const viaAdminKey = caller === "__admin_key__";
    if (!viaAdminKey && caller !== SATURDAY_DEAN) {
        return NextResponse.json({ error: "عميد السبت فقط" }, { status: 403 });
    }

    try {
        const cfgSnap = await adminDb.collection("saturdayConfig").doc("main").get();
        const allowed = (cfgSnap.exists ? (cfgSnap.data()?.allowedMembers as string[]) : []) || [];
        // The dean is always included.
        const targets = Array.from(new Set([SATURDAY_DEAN, ...allowed]));
        if (targets.length === 0) {
            return NextResponse.json({ success: false, message: "ما فيه أحد عنده وصول بعد." });
        }

        const key = currentSaturdayKey();
        const result = await sendPushNotification(
            {
                title: "🤫 طلعة السبت — حدد موقفك",
                body: "بتجي ولا لا؟ وإذا بتجي، الساعة كم توصل؟ افتح وحدد.",
                type: "default",
                tag: `saturday-rsvp-${key}`,
                url: "/saturday",
                payload: { key },
            },
            { userNames: targets },
        );

        return NextResponse.json({
            success: true,
            message: `تم إرسال التنبيه لـ ${result.sentCount} جهاز 📨`,
            sentCount: result.sentCount,
            targets: targets.length,
        });
    } catch (e: unknown) {
        console.error("saturday-rsvp reminder error", e);
        return NextResponse.json(
            { success: false, error: e instanceof Error ? e.message : "خطأ غير متوقع" },
            { status: 500 },
        );
    }
}

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

/**
 * Sends a test push to one user and returns the REAL delivery status:
 *  - "no_subscription": user never enabled notifications
 *  - "expired": push service rejected the subscription (410/404) — auto-removed
 *  - "sent": push service accepted the message (best signal available server-side)
 *  - "config_error": VAPID keys missing on the server
 */
export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"], allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const { userName } = await request.json();
        if (!userName) {
            return NextResponse.json({ success: false, status: "bad_request", error: "Missing userName" }, { status: 400 });
        }

        const usersSnap = await adminDb.collection("users").get();
        const targetDoc = usersSnap.docs.find((d) => {
            const u = d.data() as { name?: string };
            return u.name === userName || d.id === userName;
        });
        if (!targetDoc) {
            return NextResponse.json({ success: false, status: "not_found", error: "User not found" }, { status: 404 });
        }
        const targetUser = targetDoc.data() as { name?: string; pushSubscription?: string };

        // 1) No subscription at all
        if (!targetUser.pushSubscription) {
            return NextResponse.json({
                success: false,
                status: "no_subscription",
                error: "ما فعّل الإشعارات على جهازه أبداً",
            });
        }

        // 2) VAPID config check
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        if (!vapidPublicKey || !vapidPrivateKey) {
            return NextResponse.json({
                success: false,
                status: "config_error",
                error: "مفاتيح VAPID غير مهيّأة على الخادم",
            }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const webpush = require("web-push");
        webpush.setVapidDetails("mailto:abo0odi_8@yahoo.com", vapidPublicKey, vapidPrivateKey);

        let sub: unknown;
        try {
            sub = JSON.parse(targetUser.pushSubscription);
        } catch {
            await targetDoc.ref.update({ pushSubscription: null });
            return NextResponse.json({
                success: false,
                status: "expired",
                error: "اشتراك تالف — تم حذفه. يحتاج يفعّل الإشعارات من جديد",
            });
        }

        try {
            await webpush.sendNotification(
                sub,
                JSON.stringify({
                    title: "تجربة الإشعارات 🔔",
                    body: `مرحباً ${targetUser.name}! إشعار تجريبي للتأكد إن الإشعارات توصلك.`,
                    url: "/",
                    icon: "/icon.png",
                }),
            );
            return NextResponse.json({
                success: true,
                status: "sent",
                message: `✅ وصل الإشعار لخدمة الدفع — ${targetUser.name} مفترض يستلمه`,
            });
        } catch (err: unknown) {
            const e = err as { statusCode?: number; message?: string };
            const code = e?.statusCode;
            // 410 Gone / 404 Not Found → subscription is dead. Clean it up.
            if (code === 410 || code === 404) {
                await targetDoc.ref.update({ pushSubscription: null });
                return NextResponse.json({
                    success: false,
                    status: "expired",
                    error: "الاشتراك منتهي (الجهاز ما عاد مشترك) — تم حذفه. يحتاج يفعّل من جديد",
                });
            }
            console.error(`test push to ${targetUser.name} failed:`, e?.message, code);
            return NextResponse.json({
                success: false,
                status: "send_failed",
                error: `فشل الإرسال${code ? ` (كود ${code})` : ""}`,
            }, { status: 502 });
        }
    } catch (error: unknown) {
        const e = error as { message?: string };
        return NextResponse.json({ success: false, status: "error", error: e?.message || "خطأ" }, { status: 500 });
    }
}

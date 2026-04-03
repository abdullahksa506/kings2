import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"], allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const { userName } = body;

        if (!userName) {
            return NextResponse.json({ success: false, error: "Missing userName" }, { status: 400 });
        }

        const usersSnap = await adminDb.collection("users").get();
        const users = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const targetUser = users.find(u => u.name === userName || u.id === userName);

        if (!targetUser) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Web Push setup
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        let webPushInitialized = false;

        if (vapidPublicKey && vapidPrivateKey) {
            try {
                const webpush = require('web-push');
                webpush.setVapidDetails(
                    'mailto:abo0odi_8@yahoo.com',
                    vapidPublicKey,
                    vapidPrivateKey
                );
                webPushInitialized = true;
            } catch (e) {
                console.error("Web push library not installed or configured correctly.");
            }
        }

        if (webPushInitialized && targetUser.pushSubscription) {
            try {
                const sub = JSON.parse(targetUser.pushSubscription);
                const webpush = require('web-push');
                await webpush.sendNotification(sub, JSON.stringify({
                    title: `تجربة الإشعارات 🔔`,
                    body: `مرحباً ${targetUser.name}! هذا إشعار تجريبي من العميد للتأكد من عمل النظام لديك.`,
                    url: '/',
                    icon: '/icon.png'
                }));
                return NextResponse.json({ success: true, message: `تم إرسال الإشعار التجريبي إلى ${targetUser.name} بنجاح.` });
            } catch (err: any) {
                console.error(`Failed to send test Web Push to ${targetUser.name}:`, err.message);
                return NextResponse.json({ success: false, error: "فشل إرسال الإشعار للمستخدم، قد يكون الاشتراك غير صالح" }, { status: 500 });
            }
        } else {
            return NextResponse.json({ success: false, error: "المستخدم غير مشترك في الإشعارات أو إعدادات الإشعارات غير متوفرة" }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

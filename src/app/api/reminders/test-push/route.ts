import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"], allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const usersSnap = await adminDb.collection("users").get();
        const users = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        let sentCount = 0;

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

        for (const user of users) {
            // Send test notification to anyone with a subscription
            if (webPushInitialized && user.pushSubscription) {
                try {
                    const sub = JSON.parse(user.pushSubscription);
                    const webpush = require('web-push');
                    await webpush.sendNotification(sub, JSON.stringify({
                        title: `تجربة الإشعارات 🔔`,
                        body: `هذا إشعار تجريبي من العميد للتأكد من عمل النظام!`,
                        url: '/',
                        icon: '/icon.png'
                    }));
                    sentCount++;
                } catch (err: any) {
                    console.error(`Failed to send test Web Push to ${user.name}:`, err.message);
                }
            }
        }

        return NextResponse.json({ success: true, message: `Test notifications sent to ${sentCount} members.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

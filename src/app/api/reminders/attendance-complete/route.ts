import { NextResponse } from "next/server";
import { services, VALID_NAMES } from "@/lib/services";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

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

        const attendeesCount = VALID_NAMES.length - (week.absentees || []).length;
        const absenteesCount = (week.absentees || []).length;

        for (const user of users) {
            const messageTitle = `اكتملت قائمة الحضور! 📋`;
            const messageBody = `أكد الجميع حضورهم للطلعة القادمة!\n- الحاضرين: ${attendeesCount}\n- المعتذرين: ${absenteesCount}`;

            // --- 2. Send Native Web Push (iPhone) ---
            if (webPushInitialized && user.pushSubscription) {
                try {
                    const sub = JSON.parse(user.pushSubscription);
                    const webpush = require('web-push');
                    await webpush.sendNotification(sub, JSON.stringify({
                        title: messageTitle,
                        body: messageBody,
                        url: '/',
                        icon: '/icon.png'
                    }));
                    sentCount++;
                } catch (err: any) {
                    console.error(`Failed to send Web Push to ${user.name}:`, err.message);
                }
            }
        }

        return NextResponse.json({ success: true, message: `Notifications sent to ${sentCount} members.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

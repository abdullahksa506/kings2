import { NextResponse } from "next/server";
import { services } from "@/lib/services";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"], allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const week = await services.getCurrentWeek();
        if (!week) {
            return NextResponse.json({ message: "No active week to rate." });
        }

        const usersSnap = await adminDb.collection("users").get();
        const users = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        let sentCount = 0;

        // 3. Web Push setup (if configured)
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
            // King doesn't rate themselves
            if (user.name === week.king) continue;

            // Skip absent users
            if ((week.absentees || []).includes(user.name)) continue;

            const hasRated = await services.hasUserRated(week.id, user.name);
            if (!hasRated) {
                const messageBody = `لا تنسى تقيّم مطعم "${week.restaurant}" الخاص بملك الأسبوع ${week.king}. تقييمك السري يحسم النتائج!`;

                // --- 2. Send Native Web Push (iPhone) ---
                if (webPushInitialized && user.pushSubscription) {
                    try {
                        const sub = JSON.parse(user.pushSubscription);
                        const webpush = require('web-push');
                        await webpush.sendNotification(sub, JSON.stringify({
                            title: `أهلاً ${user.name} ⭐️`,
                            body: messageBody,
                            url: '/',
                            icon: '/icon.png'
                        }));
                    } catch (err: any) {
                        console.error(`Failed to send Web Push to ${user.name}:`, err.message);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: `Voting reminders sent to ${sentCount} members.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

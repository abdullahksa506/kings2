import { NextResponse } from "next/server";
import { services } from "@/lib/services";

export async function POST(request: Request) {
    // 1. Authenticate Request (optional, we'll just check if body has weekId)
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

        if (!week.restaurant || !week.day) {
            return NextResponse.json({ message: "Restaurant or day not fully decided yet." }, { status: 400 });
        }

        const users = await services.getAllUsers();
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
            // Skip absent users
            if ((week.absentees || []).includes(user.name)) continue;

            // We can notify the king too, or skip them. Let's send to everyone so they know it's locked in!

            const messageTitle = `تم تحديد الطلعة! 👑`;
            const messageBody = `الملك ${week.king} قرر الطلعة يوم ${week.day} في مطعم "${week.restaurant}". استعدوا!`;

            // Send Native Web Push (iPhone)
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

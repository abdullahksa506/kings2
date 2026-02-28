import { NextResponse } from "next/server";
import { services } from "@/lib/services";

export async function POST(request: Request) {
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

        if (week.restaurant && week.day) {
            return NextResponse.json({ message: "King has already made choices." });
        }

        const users = await services.getAllUsers();
        const kingUser = users.find(u => u.name === week.king);

        if (!kingUser || !kingUser.pushSubscription) {
            return NextResponse.json({ message: "King has no active push subscription.", noSub: true }, { status: 400 });
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

        let success = false;
        if (webPushInitialized) {
            try {
                const sub = JSON.parse(kingUser.pushSubscription);
                const webpush = require('web-push');
                await webpush.sendNotification(sub, JSON.stringify({
                    title: "يا ملكنا 👑 ننتظر قرارك!",
                    body: `ننتظر قرارك بخصوص يوم المطعم والمكان 🍔 لا تتأخر علينا!`,
                    url: '/',
                    icon: '/icon.png'
                }));
                success = true;
            } catch (err: any) {
                console.error(`Failed to send Web Push to King ${kingUser.name}:`, err.message);
                return NextResponse.json({ message: "Failed to send push." }, { status: 500 });
            }
        }

        return NextResponse.json({ success, message: `Notification sent to King ${week.king}.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

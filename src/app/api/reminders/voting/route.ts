import { NextResponse } from "next/server";
import twilio from "twilio";
import { services } from "@/lib/services";

export async function POST(request: Request) {
    // 1. Authenticate Request
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (token !== "king-cron-secret-2026") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const week = await services.getCurrentWeek();
        if (!week) {
            return NextResponse.json({ message: "No active week to rate." });
        }

        const users = await services.getAllUsers();

        // 2. We only remind users who are NOT the king, AND haven't rated yet
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !twilioPhone) {
            return NextResponse.json({ error: "Twilio unconfigured." }, { status: 500 });
        }

        const client = twilio(accountSid, authToken);
        let sentCount = 0;

        for (const user of users) {
            // King doesn't rate themselves
            if (user.name === week.king) continue;

            // Skip users without phone numbers
            if (!user.phoneNumber) continue;

            const hasRated = await services.hasUserRated(week.id, user.name);
            if (!hasRated) {
                const messageBody = `أهلاً ${user.name} ⭐️!
لا تنسى تقيّم مطعم "${week.restaurant}" الخاص بملك الأسبوع ${week.king}.
تقييمك السري يهمنا في حسم النتائج!

ادخل قيم الآن: https://kings2.onrender.com
`;
                try {
                    await client.messages.create({
                        body: messageBody,
                        from: `whatsapp:${twilioPhone}`,
                        to: `whatsapp:${user.phoneNumber.startsWith('+') ? user.phoneNumber : '+' + user.phoneNumber}`
                    });
                    sentCount++;
                } catch (err: any) {
                    console.error(`Failed to send to ${user.name}:`, err.message);
                }
            }
        }

        return NextResponse.json({ success: true, message: `Voting reminders sent to ${sentCount} members.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

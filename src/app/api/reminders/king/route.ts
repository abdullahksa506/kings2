import { NextResponse } from "next/server";
import twilio from "twilio";
import { services } from "@/lib/services";

export async function POST(request: Request) {
    // 1. Authenticate Request (super simple secret token for your cron job)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (token !== "king-cron-secret-2026") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const week = await services.getCurrentWeek();
        if (!week) {
            return NextResponse.json({ message: "No active week." });
        }

        // If King has already chosen a restaurant, no reminder needed.
        if (week.restaurant && week.day) {
            return NextResponse.json({ message: "King has already made choices." });
        }

        // 2. King hasn't chosen. Find the King's phone number.
        const users = await services.getAllUsers();
        const kingUser = users.find(u => u.name === week.king);

        if (!kingUser || !kingUser.phoneNumber) {
            return NextResponse.json({ message: "King has no phone number registered." });
        }

        // 3. Send WhatsApp via Twilio
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER; // Must be a WhatsApp enabled number

        if (!accountSid || !authToken || !twilioPhone) {
            return NextResponse.json({ error: "Twilio credentials not configured." }, { status: 500 });
        }

        const client = twilio(accountSid, authToken);

        const messageBody = `يا ملكنا ${week.king} 👑،
لا تنسى تختار مطعم هذا الاسبوع واليوم قبل ما ينتهي الوقت!🕒
- اليوم (الخميس ولا الجمعة): قبل يوم الأربعاء 8م.
- المطعم: قبل يوم الأربعاء 10م.

ادخل موقع ملك الخميس الحين: https://kings2.onrender.com
`;

        await client.messages.create({
            body: messageBody,
            from: `whatsapp:${twilioPhone}`,
            to: `whatsapp:${kingUser.phoneNumber.startsWith('+') ? kingUser.phoneNumber : '+' + kingUser.phoneNumber}`
        });

        return NextResponse.json({ success: true, message: `Reminder sent to King ${week.king}.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

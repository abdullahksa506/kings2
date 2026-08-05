import { NextResponse } from "next/server";
import { services, VALID_NAMES } from "@/lib/services";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { sendPushNotification } from "@/lib/pushHelper";
import { adminDb } from "@/lib/firebase-admin";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تفتح التصويت بنفسك؟"
 * قال: "لأن الشلة تنتظر بعض... وأنا الوحيد اللي ما عنده كسل 😂🗳️"
 *
 * فتح تصويت اليوم للأسبوع العشوائي + تنبيه الجميع.
 * خاص بالأسابيع العشوائية فقط (ما فيها ملك يقرر).
 */
export async function POST(request: Request) {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"], allowAdminKey: true });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const week = await services.getCurrentWeek();
        if (!week) {
            return NextResponse.json({ message: "ما فيه أسبوع نشط حالياً." }, { status: 400 });
        }
        if (!week.isRandom) {
            return NextResponse.json({ message: "هذي الميزة للأسبوع العشوائي فقط." }, { status: 400 });
        }

        // Reopen day voting: clear any approved day + old votes so votes are accepted
        // again (submitDayVote refuses once `day` is set).
        await adminDb.collection("weeks").doc(week.id).update({
            day: null,
            dayVotes: {},
            dayVotingEnabled: true,
        });

        // Random weeks have no king → everyone votes. Skip members who excused themselves.
        const absentees = new Set(week.absentees || []);
        const targets = VALID_NAMES.filter((name) => !absentees.has(name));

        const result = await sendPushNotification(
            {
                title: "🎲 اختاروا اليوم للأسبوع العشوائي!",
                body: "التصويت مفتوح — صوّت للخميس أو الجمعة (أو الاثنين) عشان نحدد الطلعة.",
                type: "day-change",
                tag: `random-day-vote-${week.id}`,
                url: "/?action=open-attendance",
                payload: { weekId: week.id },
            },
            { userNames: targets },
        );

        return NextResponse.json({
            success: true,
            message: `تم فتح التصويت وإرسال التنبيه لـ ${result.sentCount} جهاز 🗳️`,
            sentCount: result.sentCount,
        });
    } catch (e: any) {
        console.error("random-day-vote error", e);
        return NextResponse.json({ error: e?.message || "خطأ غير متوقع" }, { status: 500 });
    }
}

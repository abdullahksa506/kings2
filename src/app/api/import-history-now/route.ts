import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import historicalWeeks from "@/data/historicalWeeks.json";

function isAdminRequest(request: Request): boolean {
    const requiredKey = process.env.ADMIN_API_KEY;
    if (!requiredKey) return false;
    return request.headers.get("x-admin-key") === requiredKey;
}

export async function POST(request: Request) {
    if (!isAdminRequest(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        let added = 0;
        let deleted = 0;
        let errors: string[] = [];

        // 1. Delete all previous historical imports to prevent duplicates
        try {
            const weeksSnap = await adminDb.collection("weeks").get();
            for (const d of weeksSnap.docs) {
                if (d.id.startsWith("history_week_")) {
                    await d.ref.delete();
                    deleted++;
                }
            }

            const ratingsSnap = await adminDb.collection("ratings").get();
            for (const r of ratingsSnap.docs) {
                if (r.id.startsWith("rating_history_week_")) {
                    await r.ref.delete();
                }
            }
        } catch (delErr: any) {
            errors.push(`Error during cleanup: ${delErr.message}`);
        }

        // 2. Import only weeks 1-7 (skip 8 and 9 as they exist legitimately)
        const weeksToImport = historicalWeeks.filter(w => w.weekNumber <= 7);

        for (const weekData of weeksToImport) {
            try {
                // A fake old date so they sit at the very bottom of the real history
                // We space them out slightly just to guarantee sorting if needed
                const createdAtDate = new Date(`2025-01-0${weekData.weekNumber}T00:00:00Z`);
                const createdAt = admin.firestore.Timestamp.fromDate(createdAtDate);
                
                // Construct the WeekSession object
                const newWeek = {
                    king: weekData.king,
                    isRandom: weekData.isRandom,
                    cycleNumber: weekData.cycleNumber,
                    weekNumber: weekData.weekNumber,
                    day: weekData.day,
                    restaurant: weekData.restaurant,
                    activity: weekData.activity,
                    status: weekData.status,
                    ratingEnabled: weekData.ratingEnabled,
                    absentees: weekData.absentees || [],
                    responded: weekData.responded || [],
                    createdAt: createdAt,
                    historicalAverageRating: weekData.historicalAverageRating
                };

                await adminDb.collection("weeks").doc(weekData.id).set(newWeek);

                // Inject a fake rating so the leaderboard averages calculate identically
                await adminDb.collection("ratings").doc(`rating_${weekData.id}`).set({
                    weekId: weekData.id,
                    userName: "System_Import",
                    score: weekData.historicalAverageRating,
                    createdAt: createdAt
                });

                added++;
            } catch (err: any) {
                errors.push(`Error on week ${weekData.weekNumber}: ${err.message}`);
            }
        }

        if (errors.length > 0) {
            return NextResponse.json({ success: false, added, deleted, errors });
        }

        return NextResponse.json({ 
            success: true, 
            message: `تم تنظيف السجل السابق، واستيراد ${added} أسابيع قديمة (من 1 إلى 7) للوحة السجل الشامل. العبث محذوف.` 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to import" }, { status: 500 });
    }
}

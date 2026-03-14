import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import historicalWeeks from "@/data/historicalWeeks.json";

export async function GET() {
    try {
        let added = 0;
        let errors = [];

        for (const weekData of historicalWeeks) {
            try {
                // A fake old date so they sit at the very bottom of the real history
                // We space them out slightly just to guarantee sorting if needed
                const createdAtDate = new Date(`2025-01-0${weekData.weekNumber}T00:00:00Z`);
                const createdAt = Timestamp.fromDate(createdAtDate);

                const weekRef = doc(db, "weeks", weekData.id);
                
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

                await setDoc(weekRef, newWeek);

                // Inject a fake rating so the leaderboard averages calculate identically
                const ratingRef = doc(db, "ratings", `rating_${weekData.id}`);
                await setDoc(ratingRef, {
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
            return NextResponse.json({ success: false, added, errors });
        }

        return NextResponse.json({ 
            success: true, 
            message: `تم استيراد ${added} أسابيع بنجاح للوحة السجل الشامل. يمكنك الآن العودة للصفحة الرئيسية.` 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to import" }, { status: 500 });
    }
}

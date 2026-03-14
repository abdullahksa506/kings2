import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, Timestamp } from 'firebase/firestore';
import historicalWeeks from "@/data/historicalWeeks.json";

export async function GET() {
    try {
        let added = 0;
        let deleted = 0;
        let errors = [];

        // 1. Delete all previous historical imports to prevent duplicates
        try {
            const weeksSnap = await getDocs(collection(db, "weeks"));
            for (const d of weeksSnap.docs) {
                if (d.id.startsWith("history_week_")) {
                    await deleteDoc(doc(db, "weeks", d.id));
                    deleted++;
                }
            }

            const ratingsSnap = await getDocs(collection(db, "ratings"));
            for (const r of ratingsSnap.docs) {
                if (r.id.startsWith("rating_history_week_")) {
                    await deleteDoc(doc(db, "ratings", r.id));
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

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

// Expected input structure from the JSON
interface HistoricalWeekInput {
    id: string; // E.g., "week_1", "week_2" to keep order
    cycleNumber: number;
    weekNumber: number;
    king: string | null;
    isRandom: boolean;
    day: "الخميس" | "الجمعة" | null;
    restaurant: string | null;
    activity: string | null;
    absentees: string[]; // List of names that did NOT attend
    ratingScore?: number; // Optional, to inject historical ratings if wanted later, though simplified here.
    dateStr: string; // ISO date string or timestamp approximation to preserve sorting
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { weeks, secret } = body;

        // Simple protection so not just anyone can run this
        if (secret !== process.env.IMPORT_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!Array.isArray(weeks)) {
            return NextResponse.json({ error: "Weeks must be an array" }, { status: 400 });
        }

        const stats = { added: 0, errors: [] };

        for (const weekData of weeks as HistoricalWeekInput[]) {
            try {
                // Ensure the date is parsed as a Timestamp for Firestore sorting
                const dateParsed = new Date(weekData.dateStr);
                const createdAt = Timestamp.fromDate(isNaN(dateParsed.getTime()) ? new Date() : dateParsed);

                const weekRef = doc(db, "weeks", weekData.id);
                
                // Construct the WeekSession object matching services.ts
                const newWeek = {
                    king: weekData.king,
                    isRandom: weekData.isRandom,
                    cycleNumber: weekData.cycleNumber,
                    weekNumber: weekData.weekNumber,
                    day: weekData.day,
                    restaurant: weekData.restaurant,
                    activity: weekData.activity,
                    status: "completed", // Always completed for history
                    ratingEnabled: false,
                    absentees: weekData.absentees || [],
                    responded: [], // Historical, so response array doesn't matter much
                    createdAt: createdAt
                };

                await setDoc(weekRef, newWeek);
                stats.added++;

                // Optional: We could also inject average ratings into the 'ratings' collection 
                // if they provide a 'ratingScore', but keeping it simple for now as requested.

            } catch (err: any) {
                // @ts-ignore
                stats.errors.push(`Error on week ${weekData.weekNumber}: ${err.message}`);
            }
        }

        return NextResponse.json({ success: true, stats });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to parse JSON" }, { status: 500 });
    }
}

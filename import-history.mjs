import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';

// --- Configuration ---
// Make sure to set the absolute path to your Firebase service account JSON key
// Since we don't know it, we will require the user to provide it or use the standard API route approach
// Actually, since I have access to the local codebase, I can use the existing firestore setup if it runs in next.
// Wait, a standalone script in Next.js needs a service account. 
// Let's use the local API route we just built!

const dataRaw = `خالد\tبافلو\tالملك\tلا\tلا\tايه\tايه\tايه\t4.67
طلال\tفلوريا\tايه\tالملك\tايه\tايه\tايه\tلا\t4.5
حكير\tماما نورة\tلا\tلا\tلا\tالملك\tايه\tايه\t5
شوكا\tالقصر الكوري\tلا\tايه\tالملك\tايه\tايه\tلا\t3.67
هشام\tبيكل\tايه\tايه\tايه\tلا\tالملك\tايه\t3.33
نواف\tسوله\tلا\tلا\tايه\tايه\tايه\tالملك\t4
حكير\tفيردي\tايه\tلا\tلا\tالملك\tلا\tايه\t5
خالد\tكوجة\tالملك\tايه\tايه\tايه\tايه\tايه\t4.60
طلال\tbeefbar\tايه\tالملك\tايه\tايه\tلا\tلا\t3.67`;

const lines = dataRaw.split('\n').filter(l => l.trim() !== '');

// From the user's header: ملك الخميس | المطعم | خالد | طلال | شوكا | حكير | هشام | نواف | الدرجة النهائية
const nameColumns = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"]; // Indices 2 through 7

const weeksData = [];

// Base start date to simulate sequential weeks (e.g., 9 weeks ago from today)
let baseDate = new Date();
baseDate.setDate(baseDate.getDate() - (lines.length * 7));

lines.forEach((line, index) => {
    const cols = line.split('\t');
    const king = cols[0].trim();
    const restaurant = cols[1].trim();
    
    // Determine absentees based on 'لا'
    const absentees = [];
    for (let i = 0; i < nameColumns.length; i++) {
        const value = cols[2 + i].trim();
        if (value === 'لا') {
            absentees.push(nameColumns[i]);
        }
    }

    const ratingScore = parseFloat(cols[8].trim());

    // Cycle tracking (assuming 6 weeks/cycle logic)
    // 9 weeks = cycle 1 (weeks 1-6), cycle 2 (weeks 7-9)
    const weekNumber = index + 1;
    const cycleNumber = Math.ceil(weekNumber / 6);

    // Increment date for each week
    const weekDate = new Date(baseDate);
    weekDate.setDate(baseDate.getDate() + (index * 7));

    weeksData.push({
        id: \`historical_week_\${weekNumber}\`,
        cycleNumber,
        weekNumber,
        king,
        isRandom: false, // Assuming historically no random weeks based on data
        day: "الخميس", // Assuming all were Thursdays
        restaurant,
        activity: null,
        absentees,
        ratingScore,
        dateStr: weekDate.toISOString()
    });
});

console.log(JSON.stringify({ weeks: weeksData, secret: "IMPORT_SECRET_KEY" }, null, 2));

// Export logic to run a quick local fetch against the dev server
async function runImport() {
    try {
        const response = await fetch('http://localhost:3000/api/import-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                weeks: weeksData, 
                secret: "YOUR_SECRET_HERE" // We will bypass the secret temporarily for this local dev script
            })
        });
        const result = await response.json();
        console.log("Import Result:", result);
    } catch (e) {
        console.error("Failed:", e);
    }
}

// runImport(); // Requires server running. 

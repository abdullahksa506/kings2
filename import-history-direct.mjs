import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

// The standard Web SDK config used in the app
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
const nameColumns = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];

let baseDate = new Date();
baseDate.setDate(baseDate.getDate() - (lines.length * 7));

async function run() {
    console.log("Starting import...");
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const cols = line.split('\t');
        const king = cols[0].trim();
        const restaurant = cols[1].trim();
        
        const absentees = [];
        for (let i = 0; i < nameColumns.length; i++) {
            const value = cols[2 + i].trim();
            if (value === 'لا') {
                absentees.push(nameColumns[i]);
            }
        }

        const ratingScore = parseFloat(cols[8].trim());

        // We assume 1 cycle so far for historical
        const cycleNumber = 1;
        const weekNumber = index + 1;

        const weekDate = new Date(baseDate);
        weekDate.setDate(baseDate.getDate() + (index * 7));

        const weekRef = doc(db, "weeks", `history_week_${weekNumber}`);
        
        await setDoc(weekRef, {
            king,
            isRandom: false,
            cycleNumber,
            weekNumber,
            day: "الخميس",
            restaurant,
            activity: null,
            status: "completed",
            ratingEnabled: false,
            absentees: absentees,
            responded: [],
            createdAt: Timestamp.fromDate(weekDate),
            historicalAverageRating: ratingScore // We save the pre-calculated rating to display later
        });

        // Add a single fake rating document so the leaderboard averages calculate correctly
        const ratingRef = doc(db, "ratings", `history_rating_${weekNumber}`);
        await setDoc(ratingRef, {
            weekId: `history_week_${weekNumber}`,
            userName: "System",
            score: ratingScore,
            createdAt: Timestamp.fromDate(weekDate)
        });

        console.log(`Saved Week ${weekNumber}: ${restaurant}`);
    }
    console.log("Done!");
    process.exit(0);
}

run();

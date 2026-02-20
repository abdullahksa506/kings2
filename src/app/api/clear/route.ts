import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

export async function GET() {
    try {
        const collections = ["weeks", "ratings", "users"];

        for (const coll of collections) {
            const q = collection(db, coll);
            const snap = await getDocs(q);

            await Promise.all(
                snap.docs.map(d => deleteDoc(doc(db, coll, d.id)))
            );
        }

        return NextResponse.json({ success: true, message: "Database wiped clean." });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { db } from "./firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

export async function clearDatabaseForReal() {
    const collections = ["weeks", "ratings", "users"];

    for (const coll of collections) {
        const q = collection(db, coll);
        const snap = await getDocs(q);

        // Delete all documents in parallel
        await Promise.all(
            snap.docs.map(d => deleteDoc(doc(db, coll, d.id)))
        );
    }
}

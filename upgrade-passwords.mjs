import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import crypto from "crypto";

const firebaseConfig = {
    apiKey: "AIzaSyC7_2i7IYT1dFwNnwI2sYa1Blyv8ztOdSw",
    authDomain: "king1212121-3e1ab.firebaseapp.com",
    projectId: "king1212121-3e1ab",
    storageBucket: "king1212121-3e1ab.firebasestorage.app",
    messagingSenderId: "430818174340",
    appId: "1:430818174340:web:8f0db1fe60bf2fb02ee9d1",
    measurementId: "G-FEP3XHT790"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function isHashed(password) {
    return password.length === 64 && /^[a-f0-9]+$/i.test(password);
}

function hashPasswordSync(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function run() {
    console.log("Fetching users from Firestore...");
    const snap = await getDocs(collection(db, "users"));
    let count = 0;
    for (const d of snap.docs) {
        const data = d.data();
        if (data.password && !isHashed(data.password)) {
            const newHash = hashPasswordSync(data.password);
            console.log(`Upgrading plaintext password for user: ${d.id}`);
            await updateDoc(doc(db, "users", d.id), { password: newHash });
            count++;
        }
    }
    console.log(`Finished. Upgraded ${count} users to SHA-256 hashes.`);
    process.exit(0);
}

run().catch(console.error);

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function testRatings() {
    console.log("Fetching ratings...");
    const snap = await getDocs(collection(db, "ratings"));
    const ratings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Raw ratings in DB:", ratings);

    console.log("Fetching weeks...");
    const snap2 = await getDocs(collection(db, "weeks"));
    const weeks = snap2.docs.map(doc => ({ id: doc.id, king: doc.data().king, status: doc.data().status }));
    console.log("Weeks in DB:", weeks);
}

testRatings();

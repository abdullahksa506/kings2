import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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

async function testServices() {
    console.log("Testing getAllRatingsForWeek with past week ID: 3xrNOuESkW71CY4IHeLv");
    const q = query(collection(db, "ratings"), where("weekId", "==", "3xrNOuESkW71CY4IHeLv"));
    const snap = await getDocs(q);
    const ratings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Filtered ratings:", ratings);
}

testServices();

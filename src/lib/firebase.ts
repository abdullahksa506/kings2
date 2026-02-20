import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC7_2i7IYT1dFwNnwI2sYa1Blyv8ztOdSw",
    authDomain: "king1212121-3e1ab.firebaseapp.com",
    projectId: "king1212121-3e1ab",
    storageBucket: "king1212121-3e1ab.firebasestorage.app",
    messagingSenderId: "430818174340",
    appId: "1:430818174340:web:8f0db1fe60bf2fb02ee9d1",
    measurementId: "G-FEP3XHT790"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };

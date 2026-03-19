import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin Initialized successfully.");
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is missing in environment variables. Admin SDK skipped.');
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

// In Next.js build step, environment variables like FIREBASE_SERVICE_ACCOUNT_KEY
// might not be available. We gracefully fallback to a dummy object during build
// to prevent "The default Firebase app does not exist" errors that crash the build.
// When the app runs in production, the key will be present and admin.firestore() will succeed.
let db: admin.firestore.Firestore;
try {
  db = admin.firestore();
} catch (e) {
  db = null as any;
}

export const adminDb = db;

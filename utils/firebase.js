// utils/firebase.js

const admin = require('firebase-admin');

// Log to verify environment variables are loading
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Ensure newline chars are properly replaced
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL, // optional if using Realtime Database
  });
}

// Initialize Firestore with optional settings
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

module.exports = { admin, db };
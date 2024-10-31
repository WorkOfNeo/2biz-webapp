// utils/firebase.js

import * as admin from 'firebase-admin';

// Initialize Firebase only if it hasn't been initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  console.log("Firebase initialized successfully");
}

// Create a Firestore instance
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export default db;
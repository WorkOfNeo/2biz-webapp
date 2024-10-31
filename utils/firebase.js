import * as admin from 'firebase-admin';

// Log to see if environment variables are loaded correctly
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("FIREBASE_PRIVATE_KEY Loaded:", process.env.FIREBASE_PRIVATE_KEY?.length > 0);

// Check if all required environment variables are available
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error("Missing one or more Firebase environment variables.");
}

// Prepare the private key, replacing escaped newlines
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (typeof privateKey === 'string') {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

// Additional check to ensure privateKey is correctly formatted
if (!privateKey || privateKey.length === 0) {
  throw new Error("Firebase private key is empty or not correctly formatted.");
}

// Initialize Firebase only if it hasn't been initialized yet
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    throw error; // Re-throw the error to stop execution if Firebase fails to initialize
  }
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export default db;
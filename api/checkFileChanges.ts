// api/checkFileChanges.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import ftp from 'basic-ftp';
import fs from 'fs';
import csv from 'csv-parser';
import * as admin from 'firebase-admin';

// Firebase Initialization
try {
  console.log("Initializing Firebase...");
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const FTP_CONFIG = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  secure: false,
};

const CSV_FILENAME = 'Inventory.csv';
const localFilePath = `/tmp/${CSV_FILENAME}`;

// Function to download file using FTP
async function downloadFile(remotePath: string, localPath: string) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  console.log("Attempting FTP connection with config:", FTP_CONFIG);

  try {
    await client.access(FTP_CONFIG);
    console.log("FTP connection successful");
    await client.downloadTo(localPath, remotePath);
    console.log(`File downloaded successfully to ${localPath}`);
  } catch (error) {
    console.error("FTP download error:", error);
    throw error;
  } finally {
    client.close();
    console.log("FTP client connection closed");
  }
}

// Function to parse CSV and return an array of objects
async function parseCSV(filePath: string): Promise<any[]> {
  const results: any[] = [];
  console.log(`Starting to parse CSV file at: ${filePath}`);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log("CSV parsing complete. Total entries:", results.length);
        resolve(results);
      })
      .on('error', (error) => {
        console.error("Error parsing CSV file:", error);
        reject(error);
      });
  });
}

// Main Handler Function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Handler started. Preparing to download the file...");

    // Download the file from FTP
    await downloadFile(CSV_FILENAME, localFilePath);
    console.log("File download completed successfully");

    // Parse the downloaded CSV file
    const csvData = await parseCSV(localFilePath);
    console.log("CSV parsed successfully, number of entries:", csvData.length);

    if (csvData.length === 0) {
      throw new Error("CSV data is empty. No data to sync.");
    }

    // Log the first row of the CSV data
    const firstRow = csvData[0];
    console.log("First row of CSV data:", firstRow);

    // Attempt to write the first row to Firestore
    const docRef = db.collection('testCollection').doc();
    await docRef.set(firstRow);
    console.log("First row written successfully to Firestore");

    res.status(200).json({ message: "First row written successfully to Firestore." });
  } catch (error) {
    console.error("Error in checkFileChanges handler:", error);
    res.status(500).json({ error: "File check failed." });
  }
}
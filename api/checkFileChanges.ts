import { VercelRequest, VercelResponse } from '@vercel/node';
import ftp from 'basic-ftp';
import fs from 'fs';
import csv from 'csv-parser';
import * as admin from 'firebase-admin';

// Firebase Initialization
if (!admin.apps.length) {
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

// Define the structure of your CSV data
interface CsvData {
  [key: string]: string; // This assumes each row is an object with string keys and values
}

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

// Function to parse CSV and return data as an array of CsvData
async function parseCSV(filePath: string): Promise<CsvData[]> {
  const results: CsvData[] = [];
  console.log(`Starting to parse CSV file at: ${filePath}`);
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data: CsvData) => {
        results.push(data);
        console.log("Data parsed:", data); // Log each data row for debugging
      })
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
    const csvData: CsvData[] = await parseCSV(localFilePath);
    console.log("CSV parsed successfully, number of entries:", csvData.length);

    // Log Firebase environment values
    console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
    console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
    console.log("FIREBASE_DATABASE_URL:", process.env.FIREBASE_DATABASE_URL);

    // Attempt to write a single document to Firestore
    if (!csvData.length) {
      throw new Error("CSV data is empty. No data to sync.");
    }

    const testData = csvData[0]; // Take the first item as a test
    console.log("Attempting to write test data to Firestore:", testData);

    // Firestore write example
    const docRef = db.collection('testCollection').doc();
    await docRef.set(testData);
    console.log("Test data written successfully to Firestore");

    res.status(200).json({ message: "Test data written successfully to Firestore." });
  } catch (error) {
    console.error("Error in checkFileChanges handler:", error);
    res.status(500).json({ error: "File check failed." });
  }
}
import { VercelRequest, VercelResponse } from '@vercel/node';
import { downloadFile } from '../utils/ftp.js';
import { parseCSV } from '../utils/csvParser.js';
import db from '../utils/firebase.js';

const CSV_FILENAME = 'Inventory.csv';
const localFilePath = `/tmp/${CSV_FILENAME}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        console.log('Starting file download');
        await downloadFile(CSV_FILENAME, localFilePath);
        console.log('File downloaded successfully to:', localFilePath);

        const csvData = await parseCSV(localFilePath);
        console.log('CSV parsed successfully, number of entries:', csvData.length);

        // Log Firebase environment values
        console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
        console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
        console.log("FIREBASE_DATABASE_URL:", process.env.FIREBASE_DATABASE_URL);

        // Attempt to write a single document to Firestore
        const testData = csvData[0]; // Take the first item as a test
        console.log('Attempting to write test data to Firestore:', testData);

        // Firestore write example
        const docRef = db.collection('testCollection').doc();
        await docRef.set(testData);

        console.log('Test data written successfully to Firestore');
        res.status(200).json({ message: 'Test data written successfully to Firestore.' });
    } catch (error) {
        console.error('Error in checkFileChanges handler:', error);
        res.status(500).json({ error: 'File check failed.' });
    }
}
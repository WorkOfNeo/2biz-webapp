import { VercelRequest, VercelResponse } from '@vercel/node';
import { downloadFile } from '../utils/ftp.js';
import { parseCSV } from '../utils/csvParser.js';
import db from '../utils/firebase.js';
import fetch from 'node-fetch'; // Import node-fetch

const CSV_FILENAME = 'Inventory.csv';
const localFilePath = `/tmp/${CSV_FILENAME}`;
let lastModifiedTime: Date | null = null;

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

        const currentModifiedTime = new Date();

        if (!lastModifiedTime || currentModifiedTime > lastModifiedTime) {
            lastModifiedTime = currentModifiedTime;
            console.log('Attempting to sync data to Firestore. Data preview:', JSON.stringify(csvData.slice(0, 5), null, 2));

            // Prepare the sync request
            const response = await fetch(`https://${req.headers.host}/api/syncToFirestore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include Firebase credentials if needed for verification
                    Authorization: `Bearer ${process.env.VERCEL_AUTH_TOKEN || ""}`,
                },
                body: JSON.stringify(csvData),
            });

            // Log the response for debugging
            console.log('Sync response status:', response.status);
            const responseText = await response.text();
            console.log('Sync response text:', responseText);

            // Check for success
            if (!response.ok) {
                throw new Error(`Sync failed with status ${response.status}`);
            }

            res.status(200).json({ message: 'File checked and data synced.' });
        } else {
            console.log('No changes detected in CSV data since the last sync.');
            res.status(200).json({ message: 'No changes detected.' });
        }
    } catch (error) {
        console.error('Error in checkFileChanges handler:', error);
        res.status(500).json({ error: 'File check failed.' });
    }
}
// api/checkFileChanges.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { downloadFile } from '../utils/ftp.js';
import { parseCSV } from '../utils/csvParser.js';
import db from '../utils/firebase';

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

        const currentModifiedTime = new Date();

        if (!lastModifiedTime || currentModifiedTime > lastModifiedTime) {
            lastModifiedTime = currentModifiedTime;
            console.log('Syncing data to Firestore. Data preview:', JSON.stringify(csvData.slice(0, 5), null, 2));

            const response = await fetch(`https://${req.headers.host}/api/syncToFirestore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(csvData),
            });

            console.log('Sync response status:', response.status);
            const responseText = await response.text();
            console.log('Sync response text:', responseText);

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
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
    console.log('Starting file download from FTP...');
    await downloadFile(CSV_FILENAME, localFilePath);
    console.log('File downloaded successfully to', localFilePath);

    console.log('Parsing CSV data...');
    const csvData = await parseCSV(localFilePath);
    console.log('CSV parsing complete. Parsed data sample:', csvData.slice(0, 3)); // Show first 3 records as a sample

    const currentModifiedTime = new Date();
    if (!lastModifiedTime || currentModifiedTime > lastModifiedTime) {
      lastModifiedTime = currentModifiedTime;

      console.log('Data change detected. Syncing data to Firestore...');
      const syncResponse = await fetch(`https://${req.headers.host}/api/syncToFirestore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(csvData),
      });

      if (!syncResponse.ok) {
        const syncError = await syncResponse.text();
        console.error('Error syncing to Firestore:', syncError);
        res.status(syncResponse.status).json({ error: 'Sync to Firestore failed.', details: syncError });
        return;
      }

      const syncResult = await syncResponse.json();
      console.log('Data synced to Firestore successfully:', syncResult);
      res.status(200).json({ message: 'File checked and data synced.', syncResult });

    } else {
      console.log('No data changes detected since last check.');
      res.status(200).json({ message: 'No changes detected.' });
    }
  } catch (error) {
    console.error('Error in checkFileChanges handler:', error);
    res.status(500).json({ error: 'File check failed.', details: error instanceof Error ? error.message : String(error) });
  }
}
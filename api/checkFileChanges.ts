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
    console.log('File downloaded successfully to', localFilePath);

    const csvData = await parseCSV(localFilePath);
    console.log('CSV parsed successfully, data length:', csvData.length);
    console.log('CSV Data:', JSON.stringify(csvData, null, 2));

    const currentModifiedTime = new Date();

    if (!lastModifiedTime || currentModifiedTime > lastModifiedTime) {
      lastModifiedTime = currentModifiedTime;
      console.log('Attempting to sync data to Firestore:', csvData);

      // Enhanced logging for the Firebase sync
      try {
        const syncResponse = await fetch(`https://${req.headers.host}/api/syncToFirestore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(csvData),
        });
        
        console.log('Sync response status:', syncResponse.status);
        
        if (!syncResponse.ok) {
          const responseText = await syncResponse.text();
          console.error('Sync to Firestore failed, response text:', responseText);
          throw new Error(`Sync failed with status ${syncResponse.status}`);
        }

        console.log('Data synced successfully to Firestore.');
        res.status(200).json({ message: 'File checked and data synced.' });
      } catch (syncError) {
        console.error('Error during sync to Firestore:', syncError);
        res.status(500).json({ error: 'Failed to sync data to Firestore.' });
      }
    } else {
      console.log('No changes detected in file; lastModifiedTime:', lastModifiedTime);
      res.status(200).json({ message: 'No changes detected.' });
    }
  } catch (error) {
    console.error('Error in checkFileChanges handler:', error);
    res.status(500).json({ error: 'File check failed.' });
  }
}
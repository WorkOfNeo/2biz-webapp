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
    console.log('File downloaded successfully');
    
    const csvData = await parseCSV(localFilePath);
    console.log('CSV parsed successfully:', csvData);
    
    // Simulating modified time check for demo purposes
    const currentModifiedTime = new Date();
    
    if (!lastModifiedTime || currentModifiedTime > lastModifiedTime) {
      lastModifiedTime = currentModifiedTime;
      
      // Prepare the request options with headers
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Replace `YOUR_AUTH_TOKEN` with an actual auth token if required
          Authorization: `Bearer ${process.env.FIRESTORE_AUTH_TOKEN || 'YOUR_AUTH_TOKEN'}`
        },
        body: JSON.stringify(csvData),
      };

      // Send request to sync to Firestore
      const response = await fetch(`https://${req.headers.host}/api/syncToFirestore`, options);
      console.log(`Sync response status: ${response.status}`);
      const responseText = await response.text();
      console.log('Sync response text:', responseText);

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }

      res.status(200).json({ message: 'File checked and data synced.' });
    } else {
      res.status(200).json({ message: 'No changes detected.' });
    }
  } catch (error) {
    console.error('Error in checkFileChanges handler:', error);
    res.status(500).json({ error: 'File check failed.' });
  }
} 
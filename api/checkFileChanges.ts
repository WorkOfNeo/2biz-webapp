// api/checkFileChanges.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { downloadFile } from '../utils/ftp.js';
import { parseCSV } from '../utils/csvParser';
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
        await fetch(`https://${req.headers.host}/api/syncToFirestore`, {
          method: 'POST',
          body: JSON.stringify(csvData),
        });
        res.status(200).json({ message: 'File checked and data synced.' });
      } else {
        res.status(200).json({ message: 'No changes detected.' });
      }
    } catch (error) {
      console.error('Error in checkFileChanges handler:', error);
      res.status(500).json({ error: 'File check failed.' });
    }
  }
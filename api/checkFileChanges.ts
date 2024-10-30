// api/checkFileChanges.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { downloadFile } from '../utils/ftp';
import { parseCSV } from '../utils/csvParser';
import db from '../utils/firebase';

const CSV_FILENAME = 'Inventory.csv';
const localFilePath = `/tmp/${CSV_FILENAME}`;
let lastModifiedTime: Date | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await downloadFile(CSV_FILENAME, localFilePath);
    const csvData = await parseCSV(localFilePath);

    const currentModifiedTime = new Date();  // Simulating modified time check for demo

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
    res.status(500).json({ error: 'File check failed.' });
  }
}
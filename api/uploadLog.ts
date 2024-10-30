// api/uploadLog.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { downloadFile } from '../utils/ftp';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await downloadFile('serverlog.csv', '/path/on/ftp/server');
    res.status(200).json({ message: 'Log uploaded successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Log upload failed' });
  }
}
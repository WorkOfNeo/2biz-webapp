// utils/ftp.ts

import ftp from 'basic-ftp';

const FTP_CONFIG = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  secure: false,
};

export async function downloadFile(remotePath: string, localPath: string) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access(FTP_CONFIG);
    await client.downloadTo(localPath, remotePath);
  } catch (error) {
    console.error('FTP download error:', error);
    throw error;
  } finally {
    client.close();
  }
}
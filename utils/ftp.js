// utils/ftp.js

import ftp from 'basic-ftp';

const FTP_CONFIG = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  secure: false,
};

export async function downloadFile(remotePath, localPath) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  console.log('Attempting FTP connection with config:', FTP_CONFIG);

  try {
    await client.access(FTP_CONFIG);
    console.log('FTP connection successful');
    await client.downloadTo(localPath, remotePath);
    console.log(`File downloaded to ${localPath}`);
  } catch (error) {
    console.error('FTP download error:', error);
    throw error;
  } finally {
    client.close();
  }
}
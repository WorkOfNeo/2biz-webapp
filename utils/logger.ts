// utils/logger.ts

import fs from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'serverlog.csv');

if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, 'Timestamp,Message\n', 'utf8');
}

const originalConsoleLog = console.log;

console.log = function (message, ...optionalParams) {
  const timestamp = new Date().toISOString();
  const formattedMessage = typeof message === 'string' ? message.replace(/"/g, '""') : JSON.stringify(message);
  const additionalMessages = optionalParams.map((param) =>
    typeof param === 'string' ? param.replace(/"/g, '""') : JSON.stringify(param)
  ).join(' ');

  const csvLine = `"${timestamp}","${formattedMessage} ${additionalMessages}"\n`;

  fs.appendFile(logFilePath, csvLine, (err) => {
    if (err) originalConsoleLog('Failed to write log:', err);
  });

  originalConsoleLog.apply(console, arguments);
};
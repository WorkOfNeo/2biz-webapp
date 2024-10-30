// utils/csvParser.js

import fs from 'fs';
import csv from 'csv-parser';

// Function to parse CSV and return data as an array of objects
export async function parseCSV(filePath) {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}
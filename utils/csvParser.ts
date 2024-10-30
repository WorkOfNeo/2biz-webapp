// utils/csvParser.ts

import fs from 'fs';
import csv from 'csv-parser';

// Define the expected structure of each row in the CSV based on your original data structure
interface CSVData {
  SKU: string;
  itemNumber: string;
  productName: string;
  leverandor?: string;
  size?: string;
  color?: string;
  brand?: string;
  category?: string;
  recRetail?: string;
  ean?: string;
  stock?: string;
  quality?: string;
  season?: string;
  sold?: string;
  inPurchase?: string;
  leveringsuge?: string;
  salgspris?: string;
  vejlUdsalgspris?: string;
  varestatus?: string;
  aktiv?: string;
}

// Function to parse CSV and return data as an array of CSVData objects
export async function parseCSV(filePath: string): Promise<CSVData[]> {
  const results: CSVData[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data: CSVData) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}
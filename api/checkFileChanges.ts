// checkFileChanges.background.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  writeBatch,
  doc,
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
} from 'firebase/firestore';
import ftp from 'basic-ftp';
import fs from 'fs';
import csv from 'csv-parser';

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FTP_CONFIG = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  secure: false,
};

const CSV_FILENAME = 'Inventory.csv';
const localFilePath = `/tmp/${CSV_FILENAME}`;

// Function to download file using FTP and get the modified date
async function downloadFile(
  remotePath: string,
  localPath: string
): Promise<Date> {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  let modifiedDate: Date;

  console.log('Attempting FTP connection with config:', FTP_CONFIG);

  try {
    await client.access(FTP_CONFIG);
    console.log('FTP connection successful');

    // Get file information to check the modified date
    const fileInfo = await client.lastMod(remotePath);
    modifiedDate = fileInfo;

    await client.downloadTo(localPath, remotePath);
    console.log(`File downloaded successfully to ${localFilePath}`);
  } catch (error) {
    console.error('FTP download error:', error);
    throw error;
  } finally {
    client.close();
    console.log('FTP client connection closed');
  }

  return modifiedDate;
}

// Function to load the cached modified date from Firestore
async function loadCachedModifiedDate(): Promise<Date | null> {
  const syncMetadataDocRef = doc(db, 'syncMetadata', 'inventory');
  const syncMetadataSnapshot = await getDoc(syncMetadataDocRef);
  if (syncMetadataSnapshot.exists()) {
    const data = syncMetadataSnapshot.data();
    const lastModified = data.lastModified;
    console.log('Cache loaded. Last modified date:', lastModified);
    return new Date(lastModified);
  } else {
    console.log('No cache document found. Proceeding without cache.');
    return null;
  }
}

// Function to save the modified date to Firestore
async function saveCachedModifiedDate(modifiedDate: Date) {
  const syncMetadataDocRef = doc(db, 'syncMetadata', 'inventory');
  await setDoc(syncMetadataDocRef, { lastModified: modifiedDate.toISOString() });
  console.log('Cache updated with new modified date:', modifiedDate.toISOString());
}

// Function to parse CSV and return an array of objects
async function parseCSV(filePath: string): Promise<any[]> {
  const results: any[] = [];
  console.log(`Starting to parse CSV file at: ${filePath}`);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log('CSV parsing complete. Total entries:', results.length);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('Error parsing CSV file:', error);
        reject(error);
      });
  });
}

// Function to remove undefined fields from an object
function removeUndefinedFields(data: any) {
  const cleanedData: any = {};
  for (const key in data) {
    if (data[key] !== undefined && data[key] !== null) {
      cleanedData[key] = data[key];
    } else {
      // Assign empty string to undefined or null fields to maintain consistency
      cleanedData[key] = '';
    }
  }
  return cleanedData;
}

// Function to get the changed fields between two objects, with an option to exclude fields
function getChangedFields(
  existingData: any,
  newData: any,
  excludeFields: string[] = []
) {
  const changedFields: any = {};
  const allKeys = new Set([...Object.keys(existingData), ...Object.keys(newData)]);

  for (const key of Array.from(allKeys)) {
    if (excludeFields.includes(key)) {
      continue; // Skip comparison for excluded fields
    }

    let existingValue = existingData[key];
    let newValue = newData[key];

    // Normalize data: Trim strings and parse numbers
    if (typeof existingValue === 'string') {
      existingValue = existingValue.trim();
    }
    if (typeof newValue === 'string') {
      newValue = newValue.trim();
    }

    if (existingValue !== null && newValue !== null) {
      if (typeof existingValue === 'number' && typeof newValue === 'string') {
        newValue = parseFloat(newValue) || 0;
      } else if (typeof existingValue === 'string' && typeof newValue === 'number') {
        existingValue = parseFloat(existingValue) || 0;
      }
    }

    // Convert null and undefined to a common value
    if (existingValue === null || existingValue === undefined) {
      existingValue = '';
    }
    if (newValue === null || newValue === undefined) {
      newValue = '';
    }

    // Compare values
    if (existingValue !== newValue) {
      console.log(
        `Field changed for key "${key}": existingValue="${existingValue}", newValue="${newValue}"`
      );
      changedFields[key] = newValue;
    }
  }
  return changedFields;
}

// Function to generate safe Firestore document IDs
function generateDocId(...parts: (string | undefined)[]): string {
  return parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) =>
      part!
        .trim()
        .toLowerCase()
        .replace(/[\/\\\.]/g, '_')
    )
    .join('_');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Send immediate response  
    res.status(202).json({ message: 'Background processing started.' });

    // Download the file from FTP and get the modified date
    const modifiedDate = await downloadFile(CSV_FILENAME, localFilePath);

    // Load the cached modified date from Firestore
    const cachedDate = await loadCachedModifiedDate();
    if (cachedDate && modifiedDate <= cachedDate) {
      console.log('No changes detected in the CSV file. Skipping sync.');
      return res
        .status(200)
        .json({ message: 'No updates needed. CSV file has not changed.' });
    }

    // Update the cache with the new modified date in Firestore
    await saveCachedModifiedDate(modifiedDate);

    // Parse the downloaded CSV file
    const csvData = await parseCSV(localFilePath);
    console.log('CSV parsed successfully, number of entries:', csvData.length);

    if (csvData.length === 0) {
      throw new Error('CSV data is empty. No data to sync.');
    }

    // Group articles into products
    const productMap: any = {};
    for (const row of csvData) {
      try {
        // Extract relevant data
        const itemNumber = row['Item number'];
        const size = row['Size'];
        const color = row['Color'];
        const brand = row['Brand'];
        const productName = row['Product name'];
        const category = row['Category'];
        const costPrice = row['Cost price'];
        const recRetail = row['Rec Retail'];
        const ean = row['EAN'];
        const stock = row['Stock'];
        const sku = row['SKU'];
        const quality = row['Quality'];
        const season = row['Season'];
        const sold = row['Sold'];
        const inPurchase = row['In Purchase'];
        const leveringsuge = row['Leveringsuge'];
        const varestatus = row['Varestatus'];
        const inaktiv = row['Inaktiv'];

        // Ensure SKU and Item Number are valid
        if (!sku || !itemNumber) continue;

        const stockQuantity = parseInt(stock) || 0;

        const articleData = removeUndefinedFields({
          itemNumber,
          size,
          color,
          brand,
          productName,
          category,
          costPrice,
          recRetail,
          ean,
          stock,
          sku,
          quality,
          season,
          sold,
          inPurchase,
          leveringsuge,
          leverandor: row['Leverandør']?.trim() || 'Unknown Supplier',
          varestatus,
          inaktiv,
          isActive: true, // Assuming 'isActive' is always true
        });

        const productKey = `${itemNumber}`;
        if (!productMap[productKey]) {
          productMap[productKey] = {
            itemNumber,
            productName,
            category,
            season,
            varestatus,
            isActive: true,
            items: [],
            sizes: new Set(),
            totalStock: 0,
          };
        }

        productMap[productKey].items.push(articleData);
        if (articleData.size) {
          productMap[productKey].sizes.add(articleData.size);
        }
        productMap[productKey].totalStock += stockQuantity;
      } catch (error) {
        console.error('Error processing article row:', error);
      }
    }

    console.log('Data grouped successfully. Starting Firestore sync...');

    // Firestore Sync
    const articleCollection = collection(db, 'articles');
    const productCollection = collection(db, 'products');
    const logsCollection = collection(db, 'logs');
    let batch = writeBatch(db);
    const BATCH_SIZE = 500;
    let operationCount = 0;

    const updatedProducts: string[] = [];
    const createdProducts: string[] = [];

    // Fetch existing products and articles (if dataset is small)
    const existingProductsSnapshot = await getDocs(productCollection);
    const existingProductsMap: any = {};
    existingProductsSnapshot.forEach((doc) => {
      const product = doc.data();
      existingProductsMap[product.itemNumber] = { id: doc.id, data: product };
    });

    const existingArticlesSnapshot = await getDocs(articleCollection);
    const existingArticlesMap: any = {};
    existingArticlesSnapshot.forEach((doc) => {
      const article = doc.data();
      const articleKey = `${article.itemNumber}-${article.size}-${article.color}`;
      existingArticlesMap[articleKey] = { id: doc.id, data: article };
    });

    // Sync each product and associated articles
    for (const productKey in productMap) {
      const product = productMap[productKey];
      product.sizes = Array.from(product.sizes).join(', ');

      console.log(`Checking product: ${productKey}`);

      const existingProductEntry = existingProductsMap[product.itemNumber];
      if (existingProductEntry) {
        // Exclude 'items' from comparison
        const changedFields = getChangedFields(existingProductEntry.data, product, ['items']);
        if (Object.keys(changedFields).length > 0) {
          console.log(`Updating product: ${product.productName}`);
          const productDocRef = doc(productCollection, existingProductEntry.id);
          batch.update(productDocRef, changedFields);
          updatedProducts.push(product.productName);
          operationCount++;
        } else {
          console.log(`No changes for product: ${product.productName}`);
        }
      } else {
        console.log(`Creating new product: ${product.productName}`);
        const productDocRef = doc(productCollection);
        batch.set(productDocRef, product);
        createdProducts.push(product.productName);
        operationCount++;
      }

      // Commit batch if operationCount reaches BATCH_SIZE
      if (operationCount >= BATCH_SIZE) {
        console.log('Committing batch...');
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }

      for (const articleData of product.items) {
        const articleKey = `${articleData.itemNumber}-${articleData.size}-${articleData.color}`;
        const existingArticleEntry = existingArticlesMap[articleKey];
        if (existingArticleEntry) {
          const changedFields = getChangedFields(existingArticleEntry.data, articleData);
          if (Object.keys(changedFields).length > 0) {
            console.log(`Updating article: ${articleKey}`);
            const articleDocRef = doc(articleCollection, existingArticleEntry.id);
            batch.update(articleDocRef, changedFields);
            operationCount++;
          } else {
            console.log(`No changes for article: ${articleKey}`);
          }
        } else {
          console.log(`Creating new article: ${articleKey}`);
          const articleDocRef = doc(articleCollection);
          batch.set(articleDocRef, articleData);
          operationCount++;
        }

        // Commit batch if operationCount reaches BATCH_SIZE
        if (operationCount >= BATCH_SIZE) {
          console.log('Committing batch...');
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      console.log('Committing final batch...');
      await batch.commit();
    }

    // Log the sync operation (summary)
    console.log(`Products Updated: ${updatedProducts.length}`);
    console.log(`Products Created: ${createdProducts.length}`);

    const logEntry = {
      timestamp: new Date().toISOString(),
      updatedProducts,
      createdProducts,
    };
    await addDoc(logsCollection, logEntry);

    console.log('Sync complete');
    res.status(200).json({ message: 'Data synced successfully to Firestore.' });
  } catch (error) {
    console.error('Error in background processing:', error);
  }
}
import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc, collection, getDocs, addDoc, getDoc, setDoc } from 'firebase/firestore';
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
async function downloadFile(remotePath: string, localPath: string): Promise<Date> {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  let modifiedDate: Date;

  console.log("Attempting FTP connection with config:", FTP_CONFIG);

  try {
    await client.access(FTP_CONFIG);
    console.log("FTP connection successful");

    // Get file information to check the modified date
    const fileInfo = await client.lastMod(remotePath);
    modifiedDate = fileInfo;

    await client.downloadTo(localPath, remotePath);
    console.log(`File downloaded successfully to ${localFilePath}`);
  } catch (error) {
    console.error("FTP download error:", error);
    throw error;
  } finally {
    client.close();
    console.log("FTP client connection closed");
  }

  return modifiedDate;
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
        console.log("CSV parsing complete. Total entries:", results.length);
        resolve(results);
      })
      .on('error', (error) => {
        console.error("Error parsing CSV file:", error);
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
    }
  }
  return cleanedData;
}

// Function to get the changed fields between two objects
function getChangedFields(existingData: any, newData: any) {
  const changedFields: any = {};
  for (const key in newData) {
    const existingValue = existingData[key];
    let newValue = newData[key];

    // Normalize data: Trim strings and parse numbers
    if (typeof existingValue === 'string' && typeof newValue === 'string') {
      newValue = newValue.trim();
    } else if (typeof existingValue === 'number' && typeof newValue === 'string') {
      newValue = parseFloat(newValue);
    }

    // Compare values and add to changedFields if different
    if (existingValue !== newValue) {
      changedFields[key] = newValue;
    }
  }
  return changedFields;
}

// Main Handler Function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Handler started. Preparing to download the file...");

    // Download the file from FTP and get the modified date
    const modifiedDate = await downloadFile(CSV_FILENAME, localFilePath);

    // Check if the modified date is newer than the last sync
    const settingsDocRef = doc(db, 'settings', 'lastSync');
    const settingsDoc = await getDoc(settingsDocRef);

    if (settingsDoc.exists()) {
      const lastSyncDate = settingsDoc.data().lastModified?.toDate();
      if (lastSyncDate && modifiedDate <= lastSyncDate) {
        console.log("No changes detected in the CSV file. Skipping sync.");
        return res.status(200).json({ message: "No updates needed. CSV file has not changed." });
      }
    }

    // Update the last sync date
    await setDoc(settingsDocRef, { lastModified: modifiedDate });

    // Parse the downloaded CSV file
    const csvData = await parseCSV(localFilePath);
    console.log("CSV parsed successfully, number of entries:", csvData.length);

    if (csvData.length === 0) {
      throw new Error("CSV data is empty. No data to sync.");
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

        // Find the correct 'leverandor' column dynamically
        let leverandor = "Unknown Supplier";
        for (const key in row) {
          if (key.toLowerCase().includes("leveran")) {
            leverandor = row[key].trim();
            break;
          }
        }

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
          leverandor,
          varestatus,
          inaktiv,
          aktiv: 'True', // Assuming 'aktiv' is always true
        });

        const productKey = `${itemNumber}-${productName}-${leverandor}`;
        if (!productMap[productKey]) {
          productMap[productKey] = {
            itemNumber,
            productName,
            leverandor,
            category,
            season,
            varestatus,
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
        console.error("Error processing article row:", error);
      }
    }

    console.log("Data grouped successfully. Starting Firestore sync...");

    // Firestore Sync
    const articleCollection = collection(db, 'articles');
    const productCollection = collection(db, 'products');
    const logsCollection = collection(db, 'logs');
    let batch = writeBatch(db);
    const BATCH_SIZE = 500;
    let operationCount = 0;

    // Fetch existing data from Firestore
    const existingArticlesSnapshot = await getDocs(articleCollection);
    const existingArticlesMap: any = {};
    existingArticlesSnapshot.forEach((doc) => {
      const article = doc.data();
      existingArticlesMap[`${article.sku}-${article.itemNumber}`] = { id: doc.id, data: article };
    });

    const existingProductsSnapshot = await getDocs(productCollection);
    const existingProductsMap: any = {};
    existingProductsSnapshot.forEach((doc) => {
      const product = doc.data();
      existingProductsMap[`${product.itemNumber}-${product.productName}-${product.leverandor}`] = {
        id: doc.id,
        data: product,
      };
    });

    const updatedProducts: string[] = [];
    const createdProducts: string[] = [];

    // Sync each product and associated articles
    for (const productKey in productMap) {
      const product = productMap[productKey];
      product.sizes = Array.from(product.sizes).join(', ');

      const existingProductEntry = existingProductsMap[productKey];
      if (existingProductEntry) {
        const changedFields = getChangedFields(existingProductEntry.data, product);
        if (Object.keys(changedFields).length > 0) {
          const productDocRef = doc(productCollection, existingProductEntry.id);
          batch.update(productDocRef, changedFields);
          updatedProducts.push(product.productName);
        }
      } else {
        const productDocRef = doc(productCollection);
        batch.set(productDocRef, product);
        createdProducts.push(product.productName);
      }

      operationCount++;
      if (operationCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }

      for (const articleData of product.items) {
        const articleKey = `${articleData.sku}-${articleData.itemNumber}`;
        const existingArticleEntry = existingArticlesMap[articleKey];
        if (existingArticleEntry) {
          const changedFields = getChangedFields(existingArticleEntry.data, articleData);
          if (Object.keys(changedFields).length > 0) {
            const articleDocRef = doc(articleCollection, existingArticleEntry.id);
            batch.update(articleDocRef, changedFields);
          }
        } else {
          const articleDocRef = doc(articleCollection);
          batch.set(articleDocRef, articleData);
        }

        operationCount++;
        if (operationCount >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }

    if (operationCount > 0) {
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

    console.log("Sync complete");
    res.status(200).json({ message: "Data synced successfully to Firestore." });
  } catch (error) {
    console.error("Error in checkFileChanges handler:", error);
    res.status(500).json({ error: "File check failed." });
  }
}
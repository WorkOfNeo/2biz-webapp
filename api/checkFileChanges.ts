import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc, collection, getDocs } from 'firebase/firestore';
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

// Function to download file using FTP
async function downloadFile(remotePath: string, localPath: string) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  console.log("Attempting FTP connection with config:", FTP_CONFIG);

  try {
    await client.access(FTP_CONFIG);
    console.log("FTP connection successful");
    await client.downloadTo(localPath, remotePath);
    console.log(`File downloaded successfully to ${localFilePath}`);
  } catch (error) {
    console.error("FTP download error:", error);
    throw error;
  } finally {
    client.close();
    console.log("FTP client connection closed");
  }
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
    if (data[key] !== undefined) {
      cleanedData[key] = data[key];
    }
  }
  return cleanedData;
}

// Function to get the changed fields between two objects
function getChangedFields(existingData: any, newData: any) {
  const changedFields: any = {};
  for (const key in newData) {
    if (existingData[key] !== newData[key]) {
      changedFields[key] = newData[key];
    }
  }
  return changedFields;
}

// Main Handler Function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Handler started. Preparing to download the file...");

    // Download the file from FTP
    await downloadFile(CSV_FILENAME, localFilePath);
    console.log("File download completed successfully");

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
        const sku = row['SKU'];
        const itemNumber = row['Item number'];
        const productName = row['Product name'];
        const leverandor = row['Leverandør'] || row['Leverandûr'] || "Unknown Supplier";

        // Ensure SKU and Item Number are valid
        if (!sku || !itemNumber) continue;

        const stockQuantity = parseInt(row['Stock']) || 0;
        const articleData = removeUndefinedFields({
          itemNumber,
          size: row['Size'],
          color: row['Color'],
          brand: row['Brand'],
          productName,
          category: row['Category'],
          recRetail: row['Rec Retail'],
          ean: row['EAN'],
          stock: row['Stock'],
          sku,
          quality: row['Quality'],
          season: row['Season'],
          sold: row['Sold'],
          inPurchase: row['In Purchase'],
          leveringsuge: row['Leveringsuge'],
          leverandor,
          salgspris: row['Salgspris'],
          vejlUdsalgspris: row['Vejl. udsalgspris'],
          varestatus: row['Varestatus'],
          aktiv: row['Aktiv'],
        });

        const productKey = `${itemNumber}-${productName}-${leverandor}`;
        if (!productMap[productKey]) {
          productMap[productKey] = {
            itemNumber,
            productName,
            leverandor,
            category: row['Category'],
            season: row['Season'],
            varestatus: row['Varestatus'],
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

    // Sync each product and associated articles
    for (const productKey in productMap) {
      const product = productMap[productKey];
      product.sizes = Array.from(product.sizes).join(', ');
      delete product.totalStock;
      product.isActive = true;

      const existingProductEntry = existingProductsMap[productKey];
      if (existingProductEntry) {
        const changedFields = getChangedFields(existingProductEntry.data, product);
        if (Object.keys(changedFields).length > 0) {
          const productDocRef = doc(productCollection, existingProductEntry.id);
          batch.update(productDocRef, changedFields);
          console.log("Product updated:", product.productName);
        } else {
          console.log(`No changes for product: ${product.productName}`);
        }
      } else {
        const productDocRef = doc(productCollection);
        batch.set(productDocRef, product);
        console.log("New product added:", product.productName);
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
            console.log("Article updated:", articleData.sku);
          } else {
            console.log(`No changes for article with SKU: ${articleData.sku}`);
          }
        } else {
          const articleDocRef = doc(articleCollection);
          batch.set(articleDocRef, articleData);
          console.log("New article added:", articleData.sku);
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
      console.log("Final batch committed");
    }

    console.log("Sync complete");
    res.status(200).json({ message: "Data synced successfully to Firestore." });
  } catch (error) {
    console.error("Error in checkFileChanges handler:", error);
    res.status(500).json({ error: "File check failed." });
  }
}
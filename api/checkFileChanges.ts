// checkFileChanges.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import ftp from 'basic-ftp';
import fs from 'fs';
import csv from 'csv-parser';

// Define interfaces for better type safety
interface Article {
  itemNumber: string;
  size: string;
  color: string;
  brand: string;
  productName: string;
  category: string;
  costPrice: string;
  recRetail: string;
  ean: string;
  stock: string;
  sku: string;
  quality: string;
  season: string;
  sold: string;
  inPurchase: string;
  leveringsuge: string;
  leverandor: string;
  varestatus: string;
  inaktiv: string;
  isActive: boolean;
}

interface Product {
  itemNumber: string;
  productName: string;
  category: string;
  season: string;
  varestatus: string;
  isActive: boolean;
  items: Article[];
  sizes: Set<string>;
  totalStock: number;
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64 || '', 'base64').toString('utf-8');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (initError) {
    console.error('Error initializing Firebase Admin SDK:', initError);
    throw initError; // Halt execution if Firebase fails to initialize
  }
}

const db = admin.firestore();

const FTP_CONFIG = {
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  secure: false, // Set to true if your FTP server requires a secure connection
};

const CSV_FILENAME = 'Inventory.csv';
const localFilePath = `/tmp/${CSV_FILENAME}`;

// Function to download file using FTP and get the modified date
async function downloadFile(
  remotePath: string,
  localPath: string
): Promise<Date> {
  const client = new ftp.Client(30000); // Set timeout to 30 seconds
  client.ftp.verbose = true;
  let modifiedDate: Date;

  console.log('Attempting FTP connection with config:', {
    host: FTP_CONFIG.host,
    user: FTP_CONFIG.user,
    password: '****', // Mask the password in logs for security
    secure: FTP_CONFIG.secure,
  });

  try {
    await client.access(FTP_CONFIG);
    console.log('FTP connection successful.');

    // Get file information to check the modified date
    console.log(`Fetching last modified date for ${remotePath}...`);
    const fileInfo = await client.lastMod(remotePath);
    console.log('File last modified date:', fileInfo);
    modifiedDate = fileInfo;

    console.log(`Starting download of ${remotePath} to ${localFilePath}...`);
    await client.downloadTo(localPath, remotePath);
    console.log(`File downloaded successfully to ${localFilePath}.`);
  } catch (error) {
    console.error('FTP download error:', error);
    throw error; // Re-throw the error to be caught in the main handler
  } finally {
    client.close();
    console.log('FTP client connection closed.');
  }

  return modifiedDate;
}

// Function to load the cached modified date from Firestore
async function loadCachedModifiedDate(): Promise<Date | null> {
  console.log('Loading cached modified date from Firestore...');
  const syncMetadataDocRef = db.collection('syncMetadata').doc('inventory');
  try {
    const syncMetadataSnapshot = await syncMetadataDocRef.get();
    if (syncMetadataSnapshot.exists) {
      const data = syncMetadataSnapshot.data();
      const lastModified = data?.lastModified;
      console.log('Cache loaded. Last modified date:', lastModified);
      return new Date(lastModified);
    } else {
      console.log('No cache document found. Proceeding without cache.');
      return null;
    }
  } catch (error) {
    console.error('Error loading cached modified date:', error);
    throw error;
  }
}

// Function to save the modified date to Firestore
async function saveCachedModifiedDate(modifiedDate: Date) {
  console.log('Saving new modified date to Firestore...');
  const syncMetadataDocRef = db.collection('syncMetadata').doc('inventory');
  try {
    await syncMetadataDocRef.set({ lastModified: modifiedDate.toISOString() });
    console.log('Cache updated with new modified date:', modifiedDate.toISOString());
  } catch (error) {
    console.error('Error saving modified date to cache:', error);
    throw error;
  }
}

// Function to parse CSV and return an array of objects
async function parseCSV(filePath: string): Promise<any[]> {
  const results: any[] = [];
  console.log(`Starting to parse CSV file at: ${filePath}...`);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => {
        // Uncomment the next line if you want to see each parsed row
        // console.log('Parsed CSV row:', data);
        results.push(data);
      })
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

// Function to remove undefined or null fields from an object
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

// Function to get the changed fields between two objects for specific fields
function getChangedFieldsSpecificFields(
  existingData: any,
  newData: any,
  fieldsToCompare: string[]
) {
  const changedFields: any = {};

  fieldsToCompare.forEach((field) => {
    const existingValue = existingData[field];
    const newValue = newData[field];

    if (existingValue !== newValue) {
      console.log(
        `Field changed for key "${field}": existingValue="${existingValue}", newValue="${newValue}"`
      );
      changedFields[field] = newValue;
    }
  });

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

// Function to compute aggregated data for a product based on its articles
function computeAggregatedProductData(product: Product) {
  const aggregatedData: any = {};

  // Total Stock
  aggregatedData.totalStock = product.totalStock;

  // Available Sizes (as a comma-separated string without empty entries)
  aggregatedData.availableSizes = Array.from(product.sizes)
    .filter((size: string) => size.trim() !== '')
    .join(', ');

  // Additional aggregated fields can be added here
  // For example, you might compute average cost price, etc.

  return aggregatedData;
}

// Main Handler Function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Handler started. Preparing to download the file...');

    console.log('Starting FTP download...');
    // Download the file from FTP and get the modified date
    const modifiedDate = await downloadFile(CSV_FILENAME, localFilePath);
    console.log('FTP download completed. Modified date:', modifiedDate);

    console.log('Loading cached modified date...');
    // Load the cached modified date from Firestore
    const cachedDate = await loadCachedModifiedDate();
    if (cachedDate && modifiedDate <= cachedDate) {
      console.log('No changes detected in the CSV file. Skipping sync.');
      res.status(200).json({ message: 'No updates needed. CSV file has not changed.' });
      return; // Exit the function as there's nothing to sync
    }

    console.log('Saving new modified date to cache...');
    // Update the cache with the new modified date in Firestore
    await saveCachedModifiedDate(modifiedDate);

    console.log('Parsing CSV file...');
    // Parse the downloaded CSV file
    const csvData = await parseCSV(localFilePath);
    console.log('CSV parsing completed. Number of entries:', csvData.length);

    if (csvData.length === 0) {
      throw new Error('CSV data is empty. No data to sync.');
    }

    console.log('Grouping data into products...');
    // Group articles into products
    const productMap: { [key: string]: Product } = {};
    for (const row of csvData) {
      try {
        console.log('Processing CSV row:', row);
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
        if (!sku || !itemNumber) {
          console.log(`Skipping row due to missing SKU or Item Number: ${JSON.stringify(row)}`);
          continue;
        }

        const stockQuantity = parseInt(stock) || 0;

        // Search for the key that includes 'levera' (case-insensitive)
        const leverandorKey = Object.keys(row).find((key) =>
          key.toLowerCase().includes('levera')
        );
        const leverandor = leverandorKey ? row[leverandorKey]?.trim() : 'Unknown Supplier';

        const articleData: Article = removeUndefinedFields({
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
          leverandor, // Use the dynamically found leverandor value
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
            sizes: new Set<string>(),
            totalStock: 0,
          };
          console.log(`Created new product entry: ${productKey}`);
        }

        productMap[productKey].items.push(articleData);
        if (articleData.size && articleData.size.trim() !== '') {
          productMap[productKey].sizes.add(articleData.size.trim());
        }
        productMap[productKey].totalStock += stockQuantity;
        console.log(`Added article to product ${productKey}. Total stock: ${productMap[productKey].totalStock}`);
      } catch (error) {
        console.error('Error processing article row:', error);
      }
    }

    console.log('Data grouped successfully. Starting Firestore sync...');

    // Firestore Sync
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let operationCount = 0;

    const updatedProducts: string[] = [];
    const createdProducts: string[] = [];

    // Prepare product document references
    const productDocRefs = Object.keys(productMap).map((itemNumber) =>
      db.collection('products').doc(itemNumber)
    );

    console.log(`Batch reading ${productDocRefs.length} products...`);
    // Batch read existing products
    const productSnapshots = await db.getAll(...productDocRefs);
    const existingProductsMap: { [key: string]: admin.firestore.DocumentData } = {};

    productSnapshots.forEach((docSnapshot) => {
      if (docSnapshot.exists) {
        existingProductsMap[docSnapshot.id] = docSnapshot.data()!;
        console.log(`Found existing product: ${docSnapshot.id}`);
      } else {
        console.log(`Product does not exist: ${docSnapshot.id}`);
      }
    });

    console.log('Starting to sync products...');
    // Sync products
    for (const productKey in productMap) {
      const product = productMap[productKey];
      // 'availableSizes' is already computed in 'computeAggregatedProductData'
      // So no need to set 'sizes' here
      console.log(`Processing product: ${productKey}`);

      const existingProductData = existingProductsMap[product.itemNumber];
      const productDocRef = db.collection('products').doc(product.itemNumber);

      // Compute aggregated data for the product
      const aggregatedData = computeAggregatedProductData(product);

      // Include items array
      const newProductData = {
        ...aggregatedData,
        items: product.items,
      };

      if (existingProductData) {
        // Define the fields to compare, including items
        const fieldsToCompare = ['totalStock', 'availableSizes', 'items'];

        // Get changed fields only for aggregated data
        const changedFields = getChangedFieldsSpecificFields(existingProductData, newProductData, fieldsToCompare);

        // Additionally, compare items array deeply
        const itemsChanged = JSON.stringify(existingProductData.items) !== JSON.stringify(newProductData.items);
        if (itemsChanged) {
          console.log(`Items array changed for product: ${product.productName}`);
          changedFields.items = newProductData.items;
        }

        if (Object.keys(changedFields).length > 0) {
          console.log(`Updating product: ${product.productName} with fields:`, changedFields);
          batch.update(productDocRef, changedFields);
          updatedProducts.push(product.productName);
          operationCount++;
        } else {
          console.log(`No changes for product: ${product.productName}`);
        }
      } else {
        // Create a new product with aggregated data and all necessary fields
        const { itemNumber, productName, category, season, varestatus, isActive } = product;
        const newProductFullData = {
          itemNumber,
          productName,
          category,
          season,
          varestatus,
          isActive,
          ...aggregatedData,
          items: product.items,
          sizesArray: Array.from(product.sizes),
        };
        console.log(`Creating new product: ${product.productName} with data:`, newProductFullData);
        batch.set(productDocRef, newProductFullData);
        createdProducts.push(product.productName);
        operationCount++;
      }

      // Commit batch if operationCount reaches BATCH_SIZE
      if (operationCount >= BATCH_SIZE) {
        console.log('Committing batch...');
        await batch.commit();
        console.log('Batch committed.');
        batch = db.batch();
        operationCount = 0;
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      console.log('Committing final batch...');
      await batch.commit();
      console.log('Final batch committed.');
    }

    // Log the sync operation (summary)
    console.log(`Products Updated: ${updatedProducts.length}`);
    console.log(`Products Created: ${createdProducts.length}`);

    const logsCollection = db.collection('logs');
    const logEntry = {
      timestamp: new Date().toISOString(),
      updatedProducts,
      createdProducts,
    };
    await logsCollection.add(logEntry);
    console.log('Log entry added.');

    console.log('Sync complete.');
    res.status(200).json({ message: 'Data synced successfully to Firestore.' });
  } catch (error) {
    console.error('Error in checkFileChanges handler:', error);
    res.status(500).json({ error: 'File check failed.' });
  }
}
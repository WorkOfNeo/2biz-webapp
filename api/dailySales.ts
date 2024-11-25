// api/dailySales.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { Product, Article } from '../src/components/types';

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

// Define interface for aggregated sales data
interface DailySalesData {
  date: string; // YYYY-MM-DD in Danish Time
  timestamp: admin.firestore.Timestamp; // UTC timestamp of aggregation
  runAt: string; // Execution start time in Danish Time (ISO String)
  products: {
    [productId: string]: {
      productName: string;
      category: string;
      varestatus: string;
      season: string;
      colors: {
        [color: string]: {
          totalSold: number;
          totalReturned: number;
        };
      };
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Daily Sales Script started.');

    // Capture the exact time the script started in UTC
    const runAtUTC = new Date();

    // Convert runAtUTC to Danish Time
    const runAtLocal = new Date(runAtUTC.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' }));

    // Format the local run time for the document ID (e.g., 2024-11-12_07-15)
    const docId = formatDateTime(runAtLocal);

    // Format the date in Danish Time for the 'date' field (YYYY-MM-DD)
    const formattedDate = runAtLocal.toISOString().split('T')[0];

    // Format the runAtLocal as an ISO string for readability
    const runAtLocalISO = runAtLocal.toISOString();

    // Initialize dailySalesData
    const dailySalesData: DailySalesData = {
      date: formattedDate,
      timestamp: admin.firestore.Timestamp.fromDate(runAtUTC),
      runAt: runAtLocalISO,
      products: {},
    };

    console.log('Aggregating sales data...');

    // Get all products from Firestore
    const productsSnapshot = await db.collection('products').get();
    console.log(`Fetched ${productsSnapshot.size} products from Firestore.`);

    // Prepare batch for updating previous quantities
    const batch = db.batch();

    // Process each product
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data() as Product;

      const productId = productDoc.id;
      const productName = productData.productName || 'Unknown Product';
      const category = productData.category || 'Uncategorized';
      const varestatus = productData.varestatus || 'Unknown Status';

      console.log(`Processing Product ID: ${productId}, Name: ${productName}`);

      // Initialize the product entry
      dailySalesData.products[productId] = {
        productName,
        category,
        varestatus,
        season: '',
        colors: {},
      };

      // Check if 'items' is an array
      if (Array.isArray(productData.items) && productData.items.length > 0) {
        // Assume 'season' is consistent across all items; take from the first item
        const firstItemSeason = productData.items[0].season || 'Unknown Season';
        dailySalesData.products[productId].season = firstItemSeason;

        // Prepare to update the product document with new prevSold and prevStock
        const productRef = db.collection('products').doc(productId);
        const updatedItems: Article[] = [];

        for (const item of productData.items) {
          const color = item.color || 'Unknown Color';
          const currentSoldStr = item.sold || '0';
          const currentSoldQuantity = parseInt(currentSoldStr, 10) || 0;
          const currentStockStr = item.stock || '0';
          const currentStockQuantity = parseInt(currentStockStr, 10) || 0;

          // Get previous sold and stock quantities from the item, default to current if not present
          const prevSoldQuantity = item.prevSold !== undefined ? item.prevSold : currentSoldQuantity;
          const prevStockQuantity = item.prevStock !== undefined ? item.prevStock : currentStockQuantity;

          // Calculate changes
          const deltaSold = currentSoldQuantity - prevSoldQuantity;
          const deltaStock = currentStockQuantity - prevStockQuantity;

          // Calculate net change
          const netChange = deltaSold + deltaStock;

          // Log the net change
          console.log(
            `Product ID: ${productId}, Color: ${color}, Delta Sold: ${deltaSold}, Delta Stock: ${deltaStock}, Net Change: ${netChange}`
          );

          // Update the item's prevSold and prevStock for next execution
          updatedItems.push({
            ...item,
            prevSold: currentSoldQuantity,
            prevStock: currentStockQuantity,
          });

          // Initialize color entry if not present
          if (!dailySalesData.products[productId].colors[color]) {
            dailySalesData.products[productId].colors[color] = {
              totalSold: 0,
              totalReturned: 0,
            };
          }

          if (netChange > 0) {
            // Positive net change indicates new sales
            dailySalesData.products[productId].colors[color].totalSold += netChange;
            console.log(
              `Aggregated ${netChange} sold for Product ID: ${productId}, Color: ${color}`
            );
          } else if (netChange < 0) {
            // Negative net change might indicate returns
            dailySalesData.products[productId].colors[color].totalReturned += Math.abs(netChange);
            console.log(
              `Aggregated ${Math.abs(netChange)} returned for Product ID: ${productId}, Color: ${color}`
            );
          }
          // If netChange is zero, do nothing
        }

        // If no colors have sales or returns, remove the product entry
        const colors = dailySalesData.products[productId].colors;
        const hasData = Object.values(colors).some(
          (colorData) => colorData.totalSold !== 0 || colorData.totalReturned !== 0
        );
        if (!hasData) {
          console.log(`No sales or returns found for Product ID: ${productId}. Removing from dailySalesData.`);
          delete dailySalesData.products[productId];
        }

        // Update the product document with new prevSold and prevStock
        batch.update(productRef, { items: updatedItems });
      } else {
        console.warn(`Product ${productId} does not have an 'items' array or it's empty.`);
        // Remove the product if no items array
        delete dailySalesData.products[productId];
      }
    }

    console.log('Sales data aggregation complete:', dailySalesData);

    if (Object.keys(dailySalesData.products).length === 0) {
      console.warn('No sales data to store for the day.');
    } else {
      // Set the document ID to include the timestamp in Danish Time
      const salesDocRef = db.collection('dailyProductSales').doc(docId);

      // Set the document data (overwrite if it exists)
      await salesDocRef.set(dailySalesData, { merge: true });

      console.log('Daily sales data stored successfully in Firestore.');
    }

    // Commit the batch update for previous sold and stock quantities
    await batch.commit();
    console.log('Previous sold and stock quantities updated successfully.');

    res.status(200).json({
      message: 'Daily sales data updated successfully.',
      timestamp: runAtLocalISO, // Return Danish Time timestamp for front-end
    });
  } catch (error) {
    console.error('Error in Daily Sales Script:', error);
    res.status(500).json({ error: 'Failed to update daily sales data.' });
  }
}

// Helper function to format Date object into 'YYYY-MM-DD_HH-mm'
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1); // Months are zero-based
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());

  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

// Helper function to pad single digit numbers with leading zero
function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}
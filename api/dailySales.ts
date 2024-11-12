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
      colors: {
        [color: string]: {
          totalSold: number;
          // Add more fields if needed, e.g., totalStock, category
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

    // Get all products from Firestore
    const productsSnapshot = await db.collection('products').get();

    // Process each product
    productsSnapshot.forEach((productDoc) => {
      const productData = productDoc.data() as Product;

      const productId = productDoc.id;
      const productName = productData.productName || 'Unknown Product';
      const category = productData.category || 'Uncategorized';

      // Initialize the product entry
      dailySalesData.products[productId] = {
        productName,
        category,
        colors: {},
      };

      // Check if 'items' is an array
      if (Array.isArray(productData.items)) {
        productData.items.forEach((item: Article) => {
          const color = item.color || 'Unknown Color';
          const soldStr = item.sold || '0';
          const soldQuantity = parseInt(soldStr, 10) || 0;

          // Only include colors with sales greater than 0
          if (soldQuantity > 0) {
            if (!dailySalesData.products[productId].colors[color]) {
              dailySalesData.products[productId].colors[color] = {
                totalSold: 0,
                // Initialize other fields if needed
              };
            }

            // Aggregate the sold quantities
            dailySalesData.products[productId].colors[color].totalSold += soldQuantity;
          }
        });

        // If no colors have sales, remove the product entry
        if (Object.keys(dailySalesData.products[productId].colors).length === 0) {
          delete dailySalesData.products[productId];
        }
      } else {
        console.warn(`Product ${productId} does not have an 'items' array.`);
        // Optionally remove the product if no items array
        delete dailySalesData.products[productId];
      }
    });

    // Set the document ID to include the timestamp in Danish Time
    const salesDocRef = db.collection('dailyProductSales').doc(docId);

    // Set the document data (overwrite if it exists)
    await salesDocRef.set(dailySalesData, { merge: true });

    console.log('Daily Sales Script completed successfully.');

    res.status(200).json({ 
      message: 'Daily sales data updated successfully.',
      timestamp: runAtLocalISO // Return Danish Time timestamp for front-end
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
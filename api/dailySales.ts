// api/dailySales.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { Product, Article } from '../src/components/types';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines in private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.firestore();

// Define interface for aggregated sales data
interface DailySalesData {
  date: string;
  timestamp: admin.firestore.Timestamp;
  products: {
    [productId: string]: {
      productName: string;
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

    // Get all products from Firestore
    const productsSnapshot = await db.collection('products').get();

    // Initialize dailySalesData
    const dailySalesData: DailySalesData = {
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      timestamp: admin.firestore.Timestamp.now(),
      products: {},
    };

    // Process each product
    productsSnapshot.forEach((productDoc) => {
      const productData = productDoc.data() as Product;

      const productId = productDoc.id;
      const productName = productData.productName || 'Unknown Product';

      // Initialize the product entry
      dailySalesData.products[productId] = {
        productName,
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

    // Prepare the document ID as the current date
    const docId = dailySalesData.date;
    const salesDocRef = db.collection('dailyProductSales').doc(docId);

    // Set the document data (overwrite if it exists)
    await salesDocRef.set(dailySalesData, { merge: true });

    console.log('Daily Sales Script completed successfully.');

    res.status(200).json({ message: 'Daily sales data updated successfully.' });
  } catch (error) {
    console.error('Error in Daily Sales Script:', error);
    res.status(500).json({ error: 'Failed to update daily sales data.' });
  }
}
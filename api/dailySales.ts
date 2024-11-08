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

// Define interface for aggregated sales data per product with nested colors
interface ProductSalesData {
  productId: string;
  productName: string;
  colors: {
    [color: string]: {
      totalSold: number;
      // Add more fields if needed, e.g., totalStock, category
    };
  };
  date: string;
  timestamp: admin.firestore.Timestamp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Daily Sales Script started.');

    // Get all products from Firestore
    const productsSnapshot = await db.collection('products').get();

    // Initialize salesData to aggregate per product
    const salesData: { [productId: string]: ProductSalesData } = {};

    // Process each product
    productsSnapshot.forEach((productDoc) => {
      const productData = productDoc.data() as Product;

      const productId = productDoc.id;
      const productName = productData.productName || 'Unknown Product';

      // Initialize the product entry if it doesn't exist
      if (!salesData[productId]) {
        salesData[productId] = {
          productId,
          productName,
          colors: {},
          date: '', // Will set later
          timestamp: admin.firestore.Timestamp.now(),
        };
      }

      // Check if 'items' is an array
      if (Array.isArray(productData.items)) {
        productData.items.forEach((item: Article) => {
          const color = item.color || 'Unknown Color';
          const soldStr = item.sold || '0';
          const soldQuantity = parseInt(soldStr, 10) || 0;

          // Initialize the color entry if it doesn't exist
          if (!salesData[productId].colors[color]) {
            salesData[productId].colors[color] = {
              totalSold: 0,
              // Initialize other fields if needed
            };
          }

          // Aggregate the sold quantities
          salesData[productId].colors[color].totalSold += soldQuantity;
        });
      } else {
        console.warn(`Product ${productId} does not have an 'items' array.`);
      }
    });

    // Prepare to write sales data to Firestore
    const batch = db.batch();
    const timestamp = admin.firestore.Timestamp.now();
    const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    for (const productId in salesData) {
      const productSales = salesData[productId];
      productSales.date = dateString; // Set the date

      // Construct the document ID as `${productId}_${dateString}`
      const docId = `${productId}_${dateString}`;
      const salesDocRef = db.collection('dailyProductSales').doc(docId);

      batch.set(salesDocRef, {
        productId: productSales.productId,
        productName: productSales.productName,
        colors: productSales.colors,
        date: productSales.date,
        timestamp: timestamp,
      });
    }

    await batch.commit();

    console.log('Daily Sales Script completed successfully.');

    res.status(200).json({ message: 'Daily sales data updated successfully.' });
  } catch (error) {
    console.error('Error in Daily Sales Script:', error);
    res.status(500).json({ error: 'Failed to update daily sales data.' });
  }
}
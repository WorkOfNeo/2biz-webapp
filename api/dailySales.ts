// api/dailySales.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { Product, Article } from '../src/components/types';

// 1) Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const privateKey = Buffer.from(
      process.env.FIREBASE_PRIVATE_KEY_BASE64 || '',
      'base64'
    ).toString('utf-8');

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
    throw initError;
  }
}

const db = admin.firestore();

// 2) Main Handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Daily Sales Snapshot Script started.');

    // Capture the exact time in UTC
    const runAtUTC = new Date();

    // Convert to Danish Time
    const runAtLocal = new Date(
      runAtUTC.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' })
    );

    // docId with date + time if multiple snapshots per day, e.g. "2025-01-15_13-45"
    const docId = formatDateTime(runAtLocal);

    // Or if you only want one snapshot per day:
    // const docId = runAtLocal.toISOString().split('T')[0]; // e.g. "2025-01-15"

    const formattedDate = runAtLocal.toISOString().split('T')[0];
    const runAtLocalISO = runAtLocal.toISOString();

    // 3) Fetch All Products
    console.log('Fetching products from Firestore...');
    const productsSnapshot = await db.collection('products').get();
    console.log(`Fetched ${productsSnapshot.size} products.`);

    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data() as Product;
      const productId = productDoc.id;

      const productName = productData.productName || 'Unknown Product';
      const category = productData.category || 'Uncategorized';
      const season = productData.season || 'Unknown Season';
      const varestatus = productData.varestatus || 'Unknown Status';

      console.log(`Processing snapshot for product: ${productId} (${productName})`);

      // 4) Build an Items Array + totalSales
      let totalSales = 0;
      let snapshotItems: Article[] = [];

      if (Array.isArray(productData.items)) {
        snapshotItems = productData.items.map((item) => {
          // Convert sold to a number for summation
          const soldNum = parseInt(item.sold ?? '0', 10);
          totalSales += soldNum;

          // Return all required Article fields. Provide defaults if missing.
          return {
            itemNumber: item.itemNumber || '',
            size: item.size || '',
            color: item.color || '',
            brand: item.brand || '',
            productName: item.productName || '',
            category: item.category || '',
            costPrice: item.costPrice || '',
            recRetail: item.recRetail || '',
            ean: item.ean || '',
            stock: item.stock || '0',
            sku: item.sku || '',
            quality: item.quality || '',
            season: item.season || '',
            sold: item.sold || '0',
            inPurchase: item.inPurchase || '0',
            leveringsuge: item.leveringsuge || '',
            leverandor: item.leverandor || '',
            varestatus: item.varestatus || '',
            inaktiv: item.inaktiv || '',
            isActive: item.isActive !== false, // default to true if missing
            salgspris: item.salgspris || '',
            vejledendeUdsalgspris: item.vejledendeUdsalgspris || '',
          };
        });
      }

      // 5) Construct Snapshot Data
      const snapshotData = {
        date: formattedDate, // "YYYY-MM-DD"
        runAt: runAtLocalISO, // local time (ISO)
        timestamp: admin.firestore.Timestamp.fromDate(runAtUTC), // exact UTC moment
        productName,
        category,
        season,
        varestatus,
        totalSales,
        items: snapshotItems,
      };

      // 6) Store This Snapshot
      // dailySales/{productId}/dates/{docId}
      const productDocRef = db
        .collection('dailySales')
        .doc(productId)
        .collection('dates')
        .doc(docId);

      await productDocRef.set(snapshotData, { merge: true });
      console.log(`Stored snapshot for product: ${productId}, docId: ${docId}`);
    }

    console.log('Daily Sales Snapshot Complete.');
    res.status(200).json({
      message: 'Daily sales snapshot created successfully.',
      date: formattedDate,
      runAt: runAtLocalISO,
    });
  } catch (error) {
    console.error('Error in Daily Sales Snapshot Script:', error);
    res.status(500).json({ error: 'Failed to create daily sales snapshot.' });
  }
}

// Helper: Format Date/Time as "YYYY-MM-DD_HH-mm"
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());

  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

// Helper: Pad single digit with leading zero
function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}
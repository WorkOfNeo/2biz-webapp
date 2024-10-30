// api/syncToFirestore.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import db from '../utils/firebase';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const data: CSVData[] = JSON.parse(req.body);

    const articleCollectionRef = db.collection('articles');
    const productCollectionRef = db.collection('products');
    const batch = db.batch();

    data.forEach((item) => {
      const articleDocRef = articleCollectionRef.doc(item.SKU); // Example: update based on SKU
      batch.set(articleDocRef, item);
    });

    await batch.commit();
    res.status(200).json({ message: 'Data synced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
}
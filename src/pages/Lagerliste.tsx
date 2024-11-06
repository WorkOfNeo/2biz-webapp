// pages/Lagerliste.tsx

import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import Products from '../components/Products'; // Import Products component correctly

const ARTICLES_CACHE_KEY = 'cachedArticles';
const LAST_SYNC_KEY = 'lastSync';

const Lagerliste: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchKey, setFetchKey] = useState<number>(0); // To trigger re-mount of Products


  return (
    <div className="container-lg mx-auto px-2 py-8">

      {/* Display Products using the Products component with a key to trigger re-fetch */}
      {loading ? (
        <p className="text-center">Processing...</p>
      ) : (
        <Products key={fetchKey} />
      )}
    </div>
  );
};

export default Lagerliste;
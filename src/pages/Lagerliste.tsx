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

  /**
   * Handle deleting all products (articles are embedded within products).
   */
  const handleDeleteAll = async () => {
    try {
      console.log('handleDeleteAll: User initiated deletion of all products.');
      if (window.confirm('Are you sure you want to delete all products?')) {
        setLoading(true);
        console.log('handleDeleteAll: Fetching all products from Firestore.');

        const productsCollection = collection(db, 'products');
        const productsSnapshot = await getDocs(productsCollection);
        console.log(`handleDeleteAll: Retrieved ${productsSnapshot.docs.length} products.`);

        const deletionPromises = productsSnapshot.docs.map((docSnapshot) => {
          console.log(`handleDeleteAll: Deleting product with ID: ${docSnapshot.id}`);
          return deleteDoc(doc(db, 'products', docSnapshot.id));
        });

        console.log('handleDeleteAll: Awaiting deletion of all products.');
        await Promise.all(deletionPromises);
        console.log('handleDeleteAll: Successfully deleted all products.');

        // Clear cache if any (though Products handles its own cache)
        localStorage.removeItem(ARTICLES_CACHE_KEY);
        localStorage.removeItem(LAST_SYNC_KEY);
        console.log('handleDeleteAll: Cleared local storage cache.');

        // Trigger re-fetch by updating fetchKey
        setFetchKey((prev) => prev + 1);
        console.log('handleDeleteAll: Updated fetchKey to trigger Products re-fetch.');

        alert('All products deleted successfully.');
      }
    } catch (error) {
      console.error('handleDeleteAll: Error deleting all products:', error);
      alert('An error occurred while deleting all products.');
    } finally {
      setLoading(false);
      console.log('handleDeleteAll: Loading state set to false.');
    }
  };

  /**
   * Fetch and sync inventory by calling the API endpoint.
   * After syncing, trigger Products to re-fetch data.
   */
  const fetchAndSyncInventory = async () => {
    try {
      console.log('fetchAndSyncInventory: User initiated inventory sync.');
      setLoading(true);
      const response = await fetch('/api/checkFileChanges');
      console.log('fetchAndSyncInventory: Received response from /api/checkFileChanges.');

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json(); // Ensure response is valid JSON
      console.log('fetchAndSyncInventory: API response data:', data);

      // After syncing, trigger Products to re-fetch data by updating fetchKey
      setFetchKey((prev) => prev + 1);
      console.log('fetchAndSyncInventory: Updated fetchKey to trigger Products re-fetch.');
    } catch (error) {
      console.error('fetchAndSyncInventory: Error syncing inventory:', error);
      alert('An error occurred while syncing inventory.');
    } finally {
      setLoading(false);
      console.log('fetchAndSyncInventory: Loading state set to false.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Lagerliste Management</h1>

      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={fetchAndSyncInventory}
          className="bg-blue-500 text-white px-6 py-2 rounded-md shadow-md hover:bg-blue-600 transition duration-200 ease-in-out"
          disabled={loading}
        >
          {loading ? 'Syncing Inventory...' : 'Fetch & Sync Inventory'}
        </button>
        <button
          onClick={handleDeleteAll}
          className="bg-red-500 text-white px-6 py-2 rounded-md shadow-md hover:bg-red-600 transition duration-200 ease-in-out"
          disabled={loading}
        >
          {loading ? 'Deleting...' : 'Delete All'}
        </button>
      </div>

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
// src/pages/ProductsAdmin.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Sidebar from '../components/Sidebar';

export interface ExtendedArticle {
  id?: string;
  itemNumber: string;
  productName: string;
  category?: string;
  stock?: string;
  sku?: string;
  varestatus?: string;
}

const ARTICLES_CACHE_KEY = 'cachedArticles';
const LAST_SYNC_KEY = 'lastSync';

const ProductsAdmin: React.FC = () => {
  const [articles, setArticles] = useState<ExtendedArticle[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const articlesCollection = collection(db, 'articles');
      const articlesSnapshot = await getDocs(articlesCollection);
      const articlesList = articlesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as ExtendedArticle),
      }));
      setArticles(articlesList);
    } catch (error) {
      console.error('Error fetching articles: ', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle deleting all articles.
   */
  const handleDeleteAll = async () => {
    try {
      console.log('handleDeleteAll: User initiated deletion of all articles.');
      if (window.confirm('Are you sure you want to delete all articles?')) {
        setLoading(true);
        console.log('handleDeleteAll: Fetching all articles from Firestore.');

        const articlesCollection = collection(db, 'articles');
        const articlesSnapshot = await getDocs(articlesCollection);
        console.log(`handleDeleteAll: Retrieved ${articlesSnapshot.docs.length} articles.`);

        const deletionPromises = articlesSnapshot.docs.map((docSnapshot) => {
          console.log(`handleDeleteAll: Deleting article with ID: ${docSnapshot.id}`);
          return deleteDoc(doc(db, 'articles', docSnapshot.id));
        });

        console.log('handleDeleteAll: Awaiting deletion of all articles.');
        await Promise.all(deletionPromises);
        console.log('handleDeleteAll: Successfully deleted all articles.');

        // Clear cache if any
        localStorage.removeItem(ARTICLES_CACHE_KEY);
        localStorage.removeItem(LAST_SYNC_KEY);
        console.log('handleDeleteAll: Cleared local storage cache.');

        // Re-fetch articles
        await fetchArticles();
        console.log('handleDeleteAll: Re-fetched articles.');

        alert('All articles deleted successfully.');
      }
    } catch (error) {
      console.error('handleDeleteAll: Error deleting all articles:', error);
      alert('An error occurred while deleting all articles.');
    } finally {
      setLoading(false);
      console.log('handleDeleteAll: Loading state set to false.');
    }
  };

  /**
   * Fetch and sync inventory by calling the API endpoint.
   * After syncing, re-fetch articles.
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

      // After syncing, re-fetch articles
      await fetchArticles();
      console.log('fetchAndSyncInventory: Re-fetched articles.');
    } catch (error) {
      console.error('fetchAndSyncInventory: Error syncing inventory:', error);
      alert('An error occurred while syncing inventory.');
    } finally {
      setLoading(false);
      console.log('fetchAndSyncInventory: Loading state set to false.');
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(articles.length / itemsPerPage);
  const paginatedArticles = articles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <h1 className="text-3xl font-bold mb-6">Products (Admin)</h1>

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

        {loading ? (
          <p className="text-center">Processing...</p>
        ) : (
          <>
            <table className="min-w-full bg-white">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-4">Item Number</th>
                  <th className="py-2 px-4">Product Name</th>
                  <th className="py-2 px-4">Category</th>
                  <th className="py-2 px-4">Stock</th>
                  <th className="py-2 px-4">SKU</th>
                  <th className="py-2 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArticles.map((article) => (
                  <tr key={article.itemNumber} className="border-b">
                    <td className="py-2 px-4">{article.itemNumber}</td>
                    <td className="py-2 px-4">{article.productName}</td>
                    <td className="py-2 px-4">{article.category || 'N/A'}</td>
                    <td className="py-2 px-4">{article.stock || 'N/A'}</td>
                    <td className="py-2 px-4">{article.sku || 'N/A'}</td>
                    <td className="py-2 px-4">{article.varestatus || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="bg-gray-500 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                Prev
              </button>
              <p>
                Page {currentPage} of {totalPages}
              </p>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="bg-gray-500 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsAdmin;
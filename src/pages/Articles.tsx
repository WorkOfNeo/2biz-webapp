import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import Products from '../components/Products';

export interface ExtendedArticle {
  itemNumber: string;
  size?: string;
  color?: string;
  brand?: string;
  productName: string;
  category?: string;
  costPrice?: string;
  recRetail?: string;
  ean?: string;
  stock?: string;
  sku?: string;
  quality?: string;
  season?: string;
  sold?: string;
  inPurchase?: string;
  leveringsuge?: string;
  leverandor?: string;
  salgspris?: string;
  vejledendeUdsalgspris?: string;
  varestatus?: string;
}

const Articles: React.FC = () => {
  const [articles, setArticles] = useState<ExtendedArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const articlesCollection = collection(db, 'articles');
      const articlesSnapshot = await getDocs(articlesCollection);
      
      const articlesList = articlesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as ExtendedArticle), // Cast doc.data() to ExtendedArticle
      }));
  
      setArticles(articlesList);
    } catch (error) {
      console.error('Error fetching articles: ', error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      const articlesCollection = collection(db, 'articles');
      const articlesSnapshot = await getDocs(articlesCollection);
      const deletionPromises = articlesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );

      const productsCollection = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCollection);
      deletionPromises.push(...productsSnapshot.docs.map((doc) => deleteDoc(doc.ref)));

      await Promise.all(deletionPromises);
      setArticles([]);
    } catch (error) {
      console.error('Error deleting all documents: ', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAndSyncInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/checkFileChanges');
      const data = await response.json();
      console.log('Check File Changes Response:', data);
      fetchArticles(); // Refresh articles after syncing
    } catch (error) {
      console.error('Error fetching and syncing inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Articles Management</h1>

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

      {articles.length > 0 ? (
        <div className="overflow-x-auto shadow-lg">
          <table className="w-full bg-white rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="py-2 px-4">Item Number</th>
                <th className="py-2 px-4">Size</th>
                <th className="py-2 px-4">Color</th>
                <th className="py-2 px-4">Brand</th>
                <th className="py-2 px-4">Product Name</th>
                <th className="py-2 px-4">Category</th>
                <th className="py-2 px-4">Stock</th>
                <th className="py-2 px-4">Supplier</th>
                <th className="py-2 px-4">Sales Price</th>
                <th className="py-2 px-4">Suggested Retail Price</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article, index) => (
                <tr
                  key={index}
                  className="text-center odd:bg-gray-100 even:bg-gray-50"
                >
                  <td className="py-2 px-4">{article.itemNumber}</td>
                  <td className="py-2 px-4">{article.size}</td>
                  <td className="py-2 px-4">{article.color}</td>
                  <td className="py-2 px-4">{article.brand}</td>
                  <td className="py-2 px-4">{article.productName}</td>
                  <td className="py-2 px-4">{article.category}</td>
                  <td className="py-2 px-4">{article.stock}</td>
                  <td className="py-2 px-4">{article.leverandor}</td>
                  <td className="py-2 px-4">{article.salgspris}</td>
                  <td className="py-2 px-4">{article.vejledendeUdsalgspris}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-8">No articles found. Fetch and sync to load data.</p>
      )}
    </div>
  );
};

export default Articles;
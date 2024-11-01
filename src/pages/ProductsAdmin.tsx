// src/pages/ProductsAdmin.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Sidebar from '../components/Sidebar';

export interface ExtendedArticle {
  itemNumber: string;
  productName: string;
  category?: string;
  stock?: string;
  sku?: string;
  varestatus?: string;
}

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
        ...(doc.data() as ExtendedArticle), // Cast doc.data() to ExtendedArticle
      }));
      setArticles(articlesList);
    } catch (error) {
      console.error('Error fetching articles: ', error);
    } finally {
      setLoading(false);
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

        {loading ? (
          <p>Loading products...</p>
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
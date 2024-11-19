// src/pages/Top10.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Sidebar from '../components/Sidebar';

interface Variant {
  productName: string;
  vendor: string;
  color: string;
  totalSales: number;
  recRetail: number;
  costPrice: number;
}

const ITEMS_PER_PAGE = 10;

const Top10: React.FC = () => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortBySales, setSortBySales] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    fetchAndGroupProducts();
  }, [sortBySales]);

  const fetchAndGroupProducts = async () => {
    try {
      setLoading(true);
      const productsCollection = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCollection);

      const groupedVariants: { [key: string]: Variant } = {};

      productsSnapshot.docs.forEach((doc) => {
        const data = doc.data();

        const items = data.items || [];

        items.forEach((item: any) => {
          const productName = item.productName || 'Unnamed Product';
          const vendor = item.leverandor || 'Unknown Vendor';
          const costPrice = parseFloat(item.costPrice) || 0;
          const recRetail = parseFloat(item.recRetail) || 0;
          const color = item.color || 'Unknown';
          const sales = parseFloat(item.sold) || 0;

          const variantKey = `${productName}-${vendor}-${color}`;

          if (!groupedVariants[variantKey]) {
            groupedVariants[variantKey] = {
              productName,
              vendor,
              color,
              totalSales: 0,
              recRetail,
              costPrice,
            };
          }

          groupedVariants[variantKey].totalSales += sales;
        });
      });

      // Convert the groupedVariants object into an array and sort by total sales
      const variantsList = Object.values(groupedVariants);
      variantsList.sort((a, b) =>
        sortBySales ? b.totalSales - a.totalSales : a.totalSales - b.totalSales
      );

      setVariants(variantsList);
    } catch (error) {
      console.error('Error fetching and grouping products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate Dækningsgrad (DG)
  const calculateDG = (recRetail: number, costPrice: number): string => {
    if (recRetail === 0) return 'N/A';
    const dg = ((recRetail - costPrice) / recRetail) * 100;
    return `${dg.toFixed(2)}%`;
  };

  // Snapshot Functionality
  const takeSnapshot = async () => {
    try {
      const snapshotCollection = collection(db, 'snapshots');
      const timestamp = new Date().toISOString();

      // Creating the snapshot object
      const snapshotData = {
        timestamp,
        variants,
      };

      // Add a new snapshot document
      await addDoc(snapshotCollection, snapshotData);

      alert('Snapshot taken successfully!');
    } catch (error) {
      console.error('Error taking snapshot:', error);
      alert('Failed to take snapshot. Please try again.');
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(variants.length / ITEMS_PER_PAGE);
  const currentVariants = variants.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <h1 className="text-3xl font-bold mb-6">Top 10 Products</h1>
        <button
          onClick={takeSnapshot}
          className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-600 transition duration-200 ease-in-out mb-4"
        >
          Take Snapshot
        </button>
        {loading ? (
          <p>Loading products...</p>
        ) : (
          <>
            <table className="min-w-full bg-white">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-4">Product Name</th>
                  <th className="py-2 px-4">Vendor</th>
                  <th className="py-2 px-4">Color</th>
                  <th
                    className="py-2 px-4 cursor-pointer"
                    onClick={() => setSortBySales(!sortBySales)}
                  >
                    Sales {sortBySales ? '▼' : '▲'}
                  </th>
                  <th className="py-2 px-4">Retail Price</th>
                  <th className="py-2 px-4">Buying Price</th>
                  <th className="py-2 px-4">DG</th>
                </tr>
              </thead>
              <tbody>
                {currentVariants.map((variant, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-4">{variant.productName}</td>
                    <td className="py-2 px-4">{variant.vendor}</td>
                    <td className="py-2 px-4">{variant.color}</td>
                    <td className="py-2 px-4">{variant.totalSales}</td>
                    <td className="py-2 px-4">{variant.recRetail.toFixed(2)} DKK</td>
                    <td className="py-2 px-4">{variant.costPrice.toFixed(2)} DKK</td>
                    <td className="py-2 px-4">
                      {calculateDG(variant.recRetail, variant.costPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls */}
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePreviousPage}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                disabled={currentPage === totalPages}
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

export default Top10;
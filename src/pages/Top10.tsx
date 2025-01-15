// src/pages/Top10.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Sidebar from '../components/Sidebar';
import { Product } from '../components/types'; // Adjust path if needed

interface Variant {
  productName: string;
  vendor: string;
  color: string;
  totalSales: number;
  recRetail: number;
  costPrice: number;
}

const DEFAULT_ITEMS_PER_PAGE = 10;

const Top10: React.FC = () => {
  // ===== State =====
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBySales, setSortBySales] = useState(true);

  // The list of distinct seasons found in Firestore
  const [allSeasons, setAllSeasons] = useState<string[]>([]);

  // === Season Filter ===
  const [selectedSeason, setSelectedSeason] = useState('');

  // === Items Per Page ===
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  // === Pagination ===
  const [currentPage, setCurrentPage] = useState(1);

  // On mount, read URL search params for season/itemsPerPage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // If there's a param like ?season=SP+25, restore it
    const seasonParam = params.get('season') || '';
    setSelectedSeason(seasonParam);

    // If there's a param like ?itemsPerPage=20, restore it
    const itemsPerPageParam = params.get('itemsPerPage');
    if (itemsPerPageParam) {
      const parsed = parseInt(itemsPerPageParam, 10);
      if (!isNaN(parsed)) {
        setItemsPerPage(parsed);
      }
    }
  }, []);

  // Whenever season or itemsPerPage changes, update the URL
  useEffect(() => {
    const url = new URL(window.location.href);

    // season -> ?season=SP+25
    url.searchParams.set('season', selectedSeason);

    // itemsPerPage -> ?itemsPerPage=10
    url.searchParams.set('itemsPerPage', itemsPerPage.toString());

    // Update the browser URL without a full reload
    window.history.replaceState({}, '', url.toString());
  }, [selectedSeason, itemsPerPage]);

  // Whenever sortBySales or selectedSeason changes, fetch data
  useEffect(() => {
    fetchAndGroupProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBySales, selectedSeason]);

  // === Fetch & Group ===
  const fetchAndGroupProducts = async () => {
    try {
      setLoading(true);

      const productsSnapshot = await getDocs(collection(db, 'products'));

      // Gather distinct seasons
      const distinctSeasons = new Set<string>();
      // Aggregated variants
      const groupedVariants: { [key: string]: Variant } = {};

      productsSnapshot.docs.forEach((docSnap) => {
        const productData = docSnap.data() as Product;
        const items = productData.items || [];

        // Collect top-level product season for the dropdown
        if (productData.season) {
          distinctSeasons.add(productData.season);
        }

        // If user selected a specific season, skip products that don't match
        if (selectedSeason && productData.season !== selectedSeason) {
          return;
        }

        items.forEach((item) => {
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

      // Convert groupedVariants to an array
      const variantsList = Object.values(groupedVariants);

      // Sort by sales ascending or descending
      variantsList.sort((a, b) =>
        sortBySales ? b.totalSales - a.totalSales : a.totalSales - b.totalSales
      );

      setVariants(variantsList);
      setAllSeasons(Array.from(distinctSeasons));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching and grouping products:', error);
      setLoading(false);
    }
  };

  // === Snapshot functionality ===
  const takeSnapshot = async () => {
    try {
      const snapshotCollection = collection(db, 'snapshots');
      const timestamp = new Date().toISOString();
      const snapshotData = {
        timestamp,
        variants,
      };
      await addDoc(snapshotCollection, snapshotData);
      alert('Snapshot taken successfully!');
    } catch (error) {
      console.error('Error taking snapshot:', error);
      alert('Failed to take snapshot. Please try again.');
    }
  };

  // === Dækningsgrad (DG) ===
  const calculateDG = (recRetail: number, costPrice: number): string => {
    if (recRetail === 0) return 'N/A';
    const dg = ((recRetail - costPrice) / recRetail) * 100;
    return `${dg.toFixed(2)}%`;
  };

  // === Pagination Logic ===
  const totalPages = Math.ceil(variants.length / itemsPerPage);
  const currentVariants = variants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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

  // If the user changes how many items per page, jump back to page 1
  const handleItemsPerPageChange = (newValue: number) => {
    setItemsPerPage(newValue);
    setCurrentPage(1);
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Top 10 Products</h1>

        {/* Snapshot Button */}
        <button
          onClick={takeSnapshot}
          className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-600 transition duration-200 ease-in-out mb-4"
        >
          Take Snapshot
        </button>

        {/* Season Filter */}
        <div className="mb-4">
          <label htmlFor="seasonFilter" className="block font-semibold mb-2">
            Filter by Season:
          </label>
          <select
            id="seasonFilter"
            value={selectedSeason}
            onChange={(e) => {
              setSelectedSeason(e.target.value);
              setCurrentPage(1);
            }}
            className="border p-2 rounded"
          >
            <option value="">All Seasons</option>
            {allSeasons.map((seasonValue) => (
              <option key={seasonValue} value={seasonValue}>
                {seasonValue}
              </option>
            ))}
          </select>
        </div>

        {/* Items Per Page */}

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
                    onClick={() => {
                      setSortBySales(!sortBySales);
                      setCurrentPage(1);
                    }}
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
                    <td className="py-2 px-4">
                      {variant.recRetail.toFixed(2)} DKK
                    </td>
                    <td className="py-2 px-4">
                      {variant.costPrice.toFixed(2)} DKK
                    </td>
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
        <div className="mb-4">
          <label htmlFor="itemsPerPage" className="block font-semibold mb-2">
            Items per page:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="border p-2 rounded"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Top10;
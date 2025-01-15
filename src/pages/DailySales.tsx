// src/pages/DailySales.tsx
import React, { useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import Sidebar from '../components/Sidebar';

// Structure for each doc inside dailySales/{productId}/dates/{dateId}
// (Including productName so we can search by it.)
interface DailySalesDoc {
  date: string;         // e.g. '2025-01-09'
  timestamp: Timestamp; // for range queries
  runAt: string;        // local time string
  season: string;
  productName: string;  // <- must exist in your actual dailySales doc!
  colors: {
    [color: string]: {
      totalSold: number;
      totalReturned?: number;
    };
  };
  // ... any other fields like category, varestatus, etc.
}

// Form inputs
interface FormInputs {
  startDate: string;
  endDate: string;
  season: string;
  productId: string;
  productName: string;
}

// This is what we'll display in the table
interface FilteredProductData {
  date: string;
  productName: string;
  totalSold: number;
}

const DailySales: React.FC = () => {
  const { register, handleSubmit, watch } = useForm<FormInputs>({
    defaultValues: {
      startDate: '',
      endDate: '',
      season: '',
      productId: '',
      productName: '',
    },
  });

  const [filteredProductData, setFilteredProductData] =
    useState<FilteredProductData[] | null>(null);
  const [seasons, setSeasons] = useState<string[]>([]); // dynamic dropdown of seasons

  // onSubmit is called when user hits "Apply Filter"
  const onSubmit = async (data: FormInputs) => {
    const { productId, productName, startDate, endDate, season } = data;

    // If neither productId nor productName is provided, fail early
    if (!productId && !productName) {
      alert('Please enter a Product ID or Product Name.');
      return;
    }

    try {
      // We'll collect constraints in an array
      const constraints: QueryConstraint[] = [];

      // Add date constraints if given
      if (startDate) {
        constraints.push(
          where('timestamp', '>=', Timestamp.fromDate(new Date(startDate)))
        );
      }
      if (endDate) {
        // If you want inclusive, consider adding 1 day
        constraints.push(
          where('timestamp', '<=', Timestamp.fromDate(new Date(endDate)))
        );
      }

      // We'll always order by timestamp ascending
      constraints.push(orderBy('timestamp', 'asc'));

      let snapshotDocs;

      // Case 1: Searching by productId only
      if (productId && !productName) {
        // Query: dailySales -> productId -> dates
        const productDatesRef = collection(db, 'dailySales', productId, 'dates');
        const productQuery = query(productDatesRef, ...constraints);
        const snapshot = await getDocs(productQuery);
        snapshotDocs = snapshot.docs;
      }
      // Case 2: Searching by productName (optionally with productId too, though typically you’d do one or the other)
      else {
        // If we search by productName, we need a collectionGroup query
        // that looks across all dailySales subcollections named "dates".
        const datesCollectionGroup = collectionGroup(db, 'dates');
        // Add productName constraint
        constraints.push(where('productName', '==', productName));
        // If productId is also provided, you can add it as well:
        if (productId) {
          constraints.push(where('__name__', '==', productId));
          // ^ That would match the doc ID (which is your dateDocId, not the product doc).
          // Typically, you might not do this, but you could if your doc IDs
          // match some pattern. Otherwise, you might want to store productId
          // as a field in the doc and do: where('productId', '==', productId).
        }
        const productNameQuery = query(datesCollectionGroup, ...constraints);
        const snapshot = await getDocs(productNameQuery);
        snapshotDocs = snapshot.docs;
      }

      // Accumulate results
      const productSales: FilteredProductData[] = [];
      const seasonsSet = new Set<string>();

      for (const doc of snapshotDocs) {
        const docData = doc.data() as DailySalesDoc;

        // If the user wants to filter by a specific season, skip docs that don't match
        if (season && docData.season !== season) {
          continue;
        }

        // Collect possible seasons
        seasonsSet.add(docData.season);

        // Sum up totalSold across all colors
        const totalSold = Object.values(docData.colors).reduce(
          (acc, colorData) => acc + (colorData.totalSold || 0),
          0
        );

        productSales.push({
          date: docData.date,
          productName: docData.productName,
          totalSold: totalSold,
        });
      }

      // Update state
      setFilteredProductData(productSales);
      setSeasons(Array.from(seasonsSet));

    } catch (error) {
      console.error('Error fetching filtered sales data:', error);
      alert('Failed to fetch sales data. See console for details.');
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Daily Sales Dashboard</h1>

        {/* Filter Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
          <div className="flex flex-col md:flex-row md:items-end md:space-x-4">
            {/* Product ID Input */}
            <div className="mb-4 md:mb-0">
              <label
                htmlFor="productId"
                className="block text-sm font-medium text-gray-700"
              >
                Product ID
              </label>
              <input
                type="text"
                id="productId"
                {...register('productId')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="Enter Product ID"
              />
            </div>

            {/* Product Name Input */}
            <div className="mb-4 md:mb-0">
              <label
                htmlFor="productName"
                className="block text-sm font-medium text-gray-700"
              >
                Product Name
              </label>
              <input
                type="text"
                id="productName"
                {...register('productName')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="Enter Product Name"
              />
            </div>

            {/* Start Date */}
            <div className="mb-4 md:mb-0">
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700"
              >
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                {...register('startDate')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            {/* End Date */}
            <div className="mb-4 md:mb-0">
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700"
              >
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                {...register('endDate')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            {/* Season Filter (optional) */}
            <div className="mb-4 md:mb-0">
              <label
                htmlFor="season"
                className="block text-sm font-medium text-gray-700"
              >
                Season
              </label>
              <select
                id="season"
                {...register('season')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              >
                <option value="">All Seasons</option>
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="mt-4 md:mt-0">
              <button
                type="submit"
                className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </form>

        {/* Display Daily Sales Data */}
        {filteredProductData && filteredProductData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">
              Sales Data
            </h2>
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Date</th>
                  <th className="py-2 px-4 border-b">Product Name</th>
                  <th className="py-2 px-4 border-b">Total Sold</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductData.map((sale, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b">{sale.date}</td>
                    <td className="py-2 px-4 border-b">{sale.productName}</td>
                    <td className="py-2 px-4 border-b">{sale.totalSold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredProductData?.length === 0 && (
          <p className="text-gray-500">No data found.</p>
        )}
      </div>
    </div>
  );
};

export default DailySales;
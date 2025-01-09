// src/pages/DailySales.tsx
import React, { useState } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import Sidebar from '../components/Sidebar';

// Structure for each doc inside dailySales/{productId}/dates/{dateId}
interface DailySalesDoc {
  date: string;                 // e.g. '2025-01-09'
  timestamp: Timestamp;         // for range queries
  runAt: string;                // local time string
  season: string;
  colors: {
    [color: string]: {
      totalSold: number;
      totalReturned?: number;
    };
  };
  // you may also have productName, category, varestatus, etc.
}

// Form inputs
interface FormInputs {
  startDate: string;
  endDate: string;
  season: string;    // optional
  productId: string; // required to find that product doc
}

// This is what you'll display in the table
interface FilteredProductData {
  date: string;
  totalSold: number;
}

const DailySales: React.FC = () => {
  const { register, handleSubmit, watch } = useForm<FormInputs>({
    defaultValues: {
      startDate: '',
      endDate: '',
      season: '',
      productId: '',
    },
  });

  const [filteredProductData, setFilteredProductData] = useState<FilteredProductData[] | null>(null);
  const [seasons, setSeasons] = useState<string[]>([]); // if you want a dynamic dropdown of seasons

  // This gets called when user hits "Apply Filter"
  const onSubmit = async (data: FormInputs) => {
    const { productId, startDate, endDate, season } = data;

    if (!productId) {
      alert('Please enter a product ID.');
      return;
    }

    try {
      // Build collection reference: dailySales -> productId -> dates
      const productDatesRef = collection(db, 'dailySales', productId, 'dates');

      // Build constraints if user specified start/end dates
      const constraints = [];
      if (startDate) {
        // "timestamp" is from your data model, which is an admin.firestore.Timestamp in the backend
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(new Date(startDate))));
      }
      if (endDate) {
        // Add one day if you want the endDate to be inclusive
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(new Date(endDate))));
      }
      // Example: we can always order by 'timestamp' ascending
      constraints.push(orderBy('timestamp', 'asc'));

      // Perform the query
      const productQuery = query(productDatesRef, ...constraints);
      const snapshot = await getDocs(productQuery);

      // We'll accumulate results here
      const productSales: FilteredProductData[] = [];
      const seasonsSet = new Set<string>();

      snapshot.forEach((doc) => {
        const docData = doc.data() as DailySalesDoc;

        // If the user wants to filter by a specific season, skip docs that don't match
        if (season && docData.season !== season) {
          return; 
        }

        // Collect possible seasons to populate a dropdown (optional)
        seasonsSet.add(docData.season);

        // Sum up totalSold across all colors
        const totalSold = Object.values(docData.colors).reduce(
          (acc, colorData) => acc + (colorData.totalSold || 0),
          0
        );

        productSales.push({
          date: docData.date, 
          totalSold: totalSold
        });
      });

      // Update state
      setFilteredProductData(productSales);
      setSeasons(Array.from(seasonsSet));
    } catch (error) {
      console.error('Error fetching filtered sales data:', error);
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

        {/* Display Daily Sales Data for the Selected Product */}
        {filteredProductData && filteredProductData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">
              Sales Data for Product ID: {watch('productId')}
            </h2>
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Date</th>
                  <th className="py-2 px-4 border-b">Total Sold</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductData.map((sale, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b">{sale.date}</td>
                    <td className="py-2 px-4 border-b">{sale.totalSold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* If there's no data, you might show a message */}
        {filteredProductData?.length === 0 && (
          <p className="text-gray-500">No data found.</p>
        )}
      </div>
    </div>
  );
};

export default DailySales;
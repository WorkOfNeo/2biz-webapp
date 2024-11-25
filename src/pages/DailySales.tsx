// src/pages/DailySales.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import Sidebar from '../components/Sidebar'

// Define TypeScript interfaces
interface DailySalesData {
  date: string; // YYYY-MM-DD in Danish Time
  timestamp: Timestamp; // UTC timestamp of aggregation
  runAt: string; // Execution start time in Danish Time (ISO String)
  products: {
    [productId: string]: {
      productName: string;
      category: string;
      season: string; // Added season field
      colors: {
        [color: string]: {
          totalSold: number;
        };
      };
    };
  };
}

interface FormInputs {
  startDate: string;
  endDate: string;
  season: string; // For sorting/filtering by season
  productId: string; // New input field for product ID
}

// Define type for the filtered product data
interface FilteredProductData {
  date: string;
  totalSold: number;
}

const DailySales: React.FC = () => {
  const { register, handleSubmit, watch } = useForm<FormInputs>({
    defaultValues: {
      startDate: '',
      endDate: '',
      season: '', // Season filter dropdown
      productId: '', // Default productId to empty
    },
  });

  const [salesData, setSalesData] = useState<DailySalesData[]>([]);
  const [filteredProductData, setFilteredProductData] = useState<FilteredProductData[] | null>(null); // Store data for the specific product
  const [seasons, setSeasons] = useState<string[]>([]); // For storing unique seasons

  // Fetch all sales data
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const salesCollection = collection(db, 'dailyProductSales');
        const salesSnapshot = await getDocs(salesCollection);
        const salesList = salesSnapshot.docs.map((doc) => doc.data() as DailySalesData);
        setSalesData(salesList);

        // Extract all unique seasons
        const uniqueSeasons = Array.from(new Set(salesList.flatMap((sale) => Object.values(sale.products).map((product) => product.season))));
        setSeasons(uniqueSeasons);

      } catch (error) {
        console.error('Error fetching sales data:', error);
      }
    };

    fetchSalesData();
  }, []);

  // Fetch data based on selected dates, season, and product ID
  const onSubmit = async (data: FormInputs) => {
    const { productId } = data;
  
    if (!productId) {
      alert('Please enter a product ID.');
      return;
    }
  
    try {
      const salesQuery = query(
        collection(db, 'dailyProductSales'),
        where('products', 'array-contains', productId) // Filter by product ID
      );
      const salesSnapshot = await getDocs(salesQuery);
      const salesList = salesSnapshot.docs.map((doc) => doc.data() as DailySalesData);
  
      // Filter the sales data by the entered product ID
      const productSales = salesList.map((sale) => {
        if (sale.products[productId]) {
          return {
            date: sale.date,
            totalSold: Object.values(sale.products[productId].colors).reduce((acc, color) => acc + color.totalSold, 0),
          };
        }
        return null;
      }).filter((sale): sale is FilteredProductData => sale !== null);
  
      setFilteredProductData(productSales); // Update the filtered data state
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
            <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
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
          <h2 className="text-lg font-semibold mb-2">Sales Data for Product ID: {watch('productId')}</h2>
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Date</th>
                <th className="py-2 px-4 border-b">Total Sold</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductData.map((sale: FilteredProductData, index: number) => (
                <tr key={index} className="hover:bg-gray-100">
                  <td className="py-2 px-4 border-b">{sale.date}</td>
                  <td className="py-2 px-4 border-b">{sale.totalSold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>
  );
};

export default DailySales;
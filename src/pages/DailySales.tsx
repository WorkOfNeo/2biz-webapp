// src/pages/DailySales.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Define TypeScript interfaces (adjust based on your data structure)
interface DailySalesData {
  date: string; // YYYY-MM-DD in Danish Time
  timestamp: Timestamp; // UTC timestamp of aggregation
  runAt: string; // Execution start time in Danish Time (ISO String)
  products: {
    [productId: string]: {
      productName: string;
      category: string;
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
  products: string[]; // Array of selected product IDs
}

const DailySales: React.FC = () => {
  // Initialize React Hook Form
  const { register, handleSubmit, watch } = useForm<FormInputs>({
    defaultValues: {
      startDate: '',
      endDate: '',
      products: [],
    },
  });

  // State to store sales data fetched from Firestore
  const [salesData, setSalesData] = useState<DailySalesData[]>([]);

  // State to store all products for filtering
  const [allProducts, setAllProducts] = useState<{ id: string; name: string }[]>([]);

  // State to store selected products for filtering
  const [filteredProducts, setFilteredProducts] = useState<string[]>([]);

  // State to store chart data
  const [chartData, setChartData] = useState<any>(null);

  // State to store selected product details
  const [selectedProductDetails, setSelectedProductDetails] = useState<{
    productName: string;
    category: string;
    totalSold: number;
  } | null>(null);

  // Watch all form fields
  const watchAllFields = watch();

  // Fetch all products for the product filter on component mount
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsList = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().productName || 'Unknown Product',
        }));
        setAllProducts(productsList);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchAllProducts();
  }, []);

  // Handle form submission to fetch sales data based on filters
  const onSubmit = async (data: FormInputs) => {
    const { startDate, endDate, products } = data;

    // Validate date inputs
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }

    try {
      // Reference to the 'dailyProductSales' collection
      const salesCollection = collection(db, 'dailyProductSales');

      // Query Firestore for documents where 'runAt' is within the selected date range
      const salesQuery = query(
        salesCollection,
        where('runAt', '>=', new Date(startDate).toISOString()),
        where('runAt', '<=', new Date(endDate).toISOString())
      );

      const salesSnapshot = await getDocs(salesQuery);
      const salesList = salesSnapshot.docs.map((doc) => doc.data() as DailySalesData);
      setSalesData(salesList);

      // Update filtered products if any are selected
      if (products.length > 0) {
        setFilteredProducts(products);
      } else {
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  // Prepare data for the bar chart whenever salesData changes
  useEffect(() => {
    if (salesData.length === 0) {
      setChartData(null);
      return;
    }

    // Aggregate totalSold per day
    const dateMap: { [date: string]: number } = {};

    salesData.forEach((sale) => {
      const date = sale.date;
      let totalSold = 0;

      // Sum up totalSold for all products and colors
      Object.values(sale.products).forEach((product) => {
        Object.values(product.colors).forEach((color) => {
          totalSold += color.totalSold;
        });
      });

      if (dateMap[date]) {
        dateMap[date] += totalSold;
      } else {
        dateMap[date] = totalSold;
      }
    });

    // Sort dates for chronological order
    const sortedDates = Object.keys(dateMap).sort();
    const totals = sortedDates.map((date) => dateMap[date]);

    // Prepare data object for Chart.js
    setChartData({
      labels: sortedDates,
      datasets: [
        {
          label: 'Total Sold',
          data: totals,
          backgroundColor: 'rgba(59, 130, 246, 0.5)', // Blue color with opacity
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    });
  }, [salesData]);

  // Handle product selection from the table to display details
  const handleProductSelect = (productId: string) => {
    // Initialize variables to store product details
    let productName = '';
    let category = '';
    let totalSold = 0;

    // Iterate through salesData to find the selected product
    salesData.forEach((sale) => {
      const product = sale.products[productId];
      if (product) {
        productName = product.productName;
        category = product.category;
        Object.values(product.colors).forEach((color) => {
          totalSold += color.totalSold;
        });
      }
    });

    // Update the selected product details state
    setSelectedProductDetails({
      productName,
      category,
      totalSold,
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Daily Sales Dashboard</h1>

      {/* Filter Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4">
          {/* Start Date */}
          <div className="mb-4 md:mb-0">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              {...register('startDate')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          {/* End Date */}
          <div className="mb-4 md:mb-0">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              {...register('endDate')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>

          {/* Product Filter */}
          <div className="mb-4 md:mb-0">
            <label htmlFor="products" className="block text-sm font-medium text-gray-700">
              Filter Products
            </label>
            <select
              id="products"
              multiple
              {...register('products')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              {allProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Hold Ctrl (Windows) or Command (Mac) to select multiple products.
            </p>
          </div>

          {/* Submit Button */}
          <div className="mt-4 md:mt-0">
            <button
              type="submit"
              className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </form>

      {/* Chart Section */}
      <div className="mb-6">
        {chartData ? (
          <Bar
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: true,
                  text: 'Total Sales Over Time',
                },
              },
            }}
          />
        ) : (
          <p>No sales data available for the selected period.</p>
        )}
      </div>

      {/* Product Details Section */}
      {selectedProductDetails && (
        <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Product Details</h2>
          <p>
            <strong>Name:</strong> {selectedProductDetails.productName}
          </p>
          <p>
            <strong>Category:</strong> {selectedProductDetails.category}
          </p>
          <p>
            <strong>Total Sold:</strong> {selectedProductDetails.totalSold}
          </p>
        </div>
      )}

      {/* Sales Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Sales Data Table</h2>
        {salesData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Date</th>
                  <th className="py-2 px-4 border-b">Total Sold</th>
                  <th className="py-2 px-4 border-b">View Details</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((sale, index) => {
                  // Calculate total sold for the day
                  let totalSold = 0;
                  Object.values(sale.products).forEach((product) => {
                    Object.values(product.colors).forEach((color) => {
                      totalSold += color.totalSold;
                    });
                  });

                  return (
                    <tr key={index} className="hover:bg-gray-100">
                      <td className="py-2 px-4 border-b">{sale.date}</td>
                      <td className="py-2 px-4 border-b">{totalSold}</td>
                      <td className="py-2 px-4 border-b">
                        {/* Display a list of products sold on that day */}
                        <button
                          onClick={() => handleProductSelect(Object.keys(sale.products)[0])}
                          className="text-blue-600 hover:underline"
                        >
                          View Products
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No sales data to display.</p>
        )}
      </div>
    </div>
  );
};

export default DailySales;
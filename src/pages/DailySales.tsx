// src/pages/DailySales.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Define TypeScript interfaces (ensure they align with your Firestore data)
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
}

const DailySales: React.FC = () => {
  // Initialize React Hook Form
  const { register, handleSubmit, watch } = useForm<FormInputs>({
    defaultValues: {
      startDate: '',
      endDate: '',
    },
  });

  // State to store sales data fetched from Firestore
  const [salesData, setSalesData] = useState<DailySalesData[]>([]);

  // State to store all products for toggling
  const [allProducts, setAllProducts] = useState<{ id: string; name: string }[]>([]);

  // State to store active (visible) products
  const [activeProducts, setActiveProducts] = useState<string[]>([]);

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
        console.log('Fetched Products:', productsList);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchAllProducts();
  }, []);

  // Handle form submission to fetch sales data based on filters
  const onSubmit = async (data: FormInputs) => {
    const { startDate, endDate } = data;

    // Validate date inputs
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }

    try {
      console.log('Fetching sales data from', startDate, 'to', endDate);

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
      console.log('Fetched Sales Data:', salesList);

      // Initialize activeProducts with all products present in the fetched sales data
      const productIds = new Set<string>();
      salesList.forEach((sale) => {
        Object.keys(sale.products).forEach((productId) => productIds.add(productId));
      });
      const activeProductArray = Array.from(productIds);
      setActiveProducts(activeProductArray);
      console.log('Active Products Initialized:', activeProductArray);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  // Prepare data for the line chart whenever salesData or activeProducts changes
  useEffect(() => {
    if (salesData.length === 0) {
      setChartData(null);
      console.log('No sales data available.');
      return;
    }

    console.log('Preparing chart data...');
    
    // Extract unique sorted dates
    const uniqueDates = Array.from(new Set(salesData.map((sale) => sale.date))).sort();
    console.log('Unique Dates:', uniqueDates);

    // Extract unique products present in salesData
    const productMap: { [productId: string]: string } = {}; // productId: productName
    salesData.forEach((sale) => {
      Object.entries(sale.products).forEach(([productId, product]) => {
        productMap[productId] = product.productName;
      });
    });

    const productIds = Object.keys(productMap);
    console.log('Product Map:', productMap);

    // Initialize data structure for chart
    const datasets = productIds
      .filter((productId) => activeProducts.includes(productId)) // Only include active products
      .map((productId, index) => {
        // Assign a color for each product (cycle through a predefined list)
        const colors = [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ];
        const color = colors[index % colors.length];

        // Aggregate totalSold per date for the product
        const dataPoints = uniqueDates.map((date) => {
          const sale = salesData.find((s) => s.date === date);
          if (sale && sale.products[productId]) {
            // Sum totalSold across all colors for the product on this date
            const totalSold = Object.values(sale.products[productId].colors).reduce(
              (acc, colorData) => acc + colorData.totalSold,
              0
            );
            return totalSold;
          }
          return 0; // No sales for this product on this date
        });

        return {
          label: productMap[productId],
          data: dataPoints,
          fill: false,
          borderColor: color,
          backgroundColor: color,
          tension: 0.1,
        };
      });

    console.log('Datasets for Chart:', datasets);

    // Prepare chart data
    const preparedChartData = {
      labels: uniqueDates,
      datasets: datasets,
    };

    setChartData(preparedChartData);
    console.log('Chart Data Prepared:', preparedChartData);
  }, [salesData, activeProducts]);

  // Handle product toggling
  const handleToggleProduct = (productId: string) => {
    setActiveProducts((prevActive) => {
      if (prevActive.includes(productId)) {
        // Remove the product from activeProducts
        const updatedActive = prevActive.filter((id) => id !== productId);
        console.log(`Product toggled off: ${productId}`);
        return updatedActive;
      } else {
        // Add the product to activeProducts
        const updatedActive = [...prevActive, productId];
        console.log(`Product toggled on: ${productId}`);
        return updatedActive;
      }
    });
  };

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

    console.log('Selected Product Details:', {
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

      {/* Product Toggle Section */}
      {salesData.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Filter Products</h2>
          <div className="flex flex-wrap">
            {Array.from(new Set(salesData.flatMap((sale) => Object.keys(sale.products)))).map(
              (productId) => {
                const productName =
                  allProducts.find((product) => product.id === productId)?.name ||
                  salesData
                    .flatMap((sale) =>
                      Object.entries(sale.products).map(([id, product]) => ({
                        id,
                        name: product.productName,
                      }))
                    )
                    .find((product) => product.id === productId)?.name ||
                  'Unknown Product';

                return (
                  <div key={productId} className="mr-4 mb-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={activeProducts.includes(productId)}
                        onChange={() => handleToggleProduct(productId)}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700">{productName}</span>
                    </label>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="mb-6">
        {chartData ? (
          <Line
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
              interaction: {
                mode: 'index' as const,
                intersect: false,
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Total Sold',
                  },
                },
                x: {
                  title: {
                    display: true,
                    text: 'Date',
                  },
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
                          onClick={() => {
                            const productIds = Object.keys(sale.products);
                            if (productIds.length > 0) {
                              // For debugging, log all productIds
                              console.log('Products sold on', sale.date, ':', productIds);
                              handleProductSelect(productIds[0]); // Modify as needed to display multiple products
                            } else {
                              console.log('No products sold on', sale.date);
                            }
                          }}
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
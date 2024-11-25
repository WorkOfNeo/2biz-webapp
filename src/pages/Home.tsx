  // src/pages/Home.tsx
  import React, { useState, useEffect } from 'react';
  import { Link } from 'react-router-dom';
  import Sidebar from '../components/Sidebar';
  import { db } from '../firebase';
  import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
  } from 'firebase/firestore';

  // Define TypeScript interfaces
  interface BuyingOrder {
    id: string;
    leverandor: string;
    ordreDato: Date;
    ordreNr: string;
    style: string;
    farve: string;
    koebtAntal: number;
    etaDato: Date;
    leveringsuge: number;
    saeson: string;
    productId: string;
    bekraeftet: boolean;
    leveret: string;
    kommentarer: string[];
  }

  interface DailySalesData {
    date: string; // YYYY-MM-DD in Danish Time
    timestamp: Timestamp; // Firestore Timestamp
    products: {
      [productId: string]: {
        productName: string;
        category: string;
        season: string;
        colors: {
          [color: string]: {
            totalSold: number;
          };
        };
      };
    };
  }

  const Home: React.FC = () => {
    const [buyingOrders, setBuyingOrders] = useState<BuyingOrder[]>([]);
    const [salesDifference, setSalesDifference] = useState<any[]>([]);
    const [seasonFilter, setSeasonFilter] = useState<string>(''); // Initially empty
    const [seasonOptions, setSeasonOptions] = useState<string[]>([]);
    const [periodStartDate, setPeriodStartDate] = useState<string>('');
    const [periodEndDate, setPeriodEndDate] = useState<string>('');

    // Fetch Buying Orders
    useEffect(() => {
      const fetchBuyingOrders = async () => {
        try {
          const ordersRef = collection(db, 'buyingOrders');
          const ordersSnapshot = await getDocs(ordersRef);
          const ordersList = ordersSnapshot.docs.map((doc) => {
            const data = doc.data();

            return {
              id: doc.id,
              leverandor: data.leverandor || '',
              ordreDato: data.ordreDato?.toDate() || new Date(),
              ordreNr: data.ordreNr || '',
              style: data.style || '',
              farve: data.farve || '',
              koebtAntal: data.koebtAntal || 0,
              etaDato: data.etaDato?.toDate() || new Date(),
              leveringsuge: data.leveringsuge || 0,
              saeson: data.saeson || '',
              productId: data.productId || '',
              bekraeftet: data.bekraeftet || false,
              leveret: data.leveret || 'Nej',
              kommentarer: data.kommentarer || [],
            } as BuyingOrder;
          });
          setBuyingOrders(ordersList);
        } catch (error) {
          console.error('Error fetching buying orders:', error);
        }
      };

      fetchBuyingOrders();
    }, []);

    // Fetch Seasons from Products
    useEffect(() => {
      const fetchSeasons = async () => {
        try {
          const productsRef = collection(db, 'products');
          const productsSnapshot = await getDocs(productsRef);
          const seasonsSet = new Set<string>();

          productsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.season) {
              seasonsSet.add(data.season);
            }
          });

          const seasonsArray = Array.from(seasonsSet);
          seasonsArray.sort(); // Optionally sort the seasons

          setSeasonOptions(seasonsArray);

          if (!seasonFilter) {
            // Set default seasonFilter to 'WI 24' if available, else first season
            const defaultSeason = seasonsArray.includes('ES 25') ? 'ES 25' : seasonsArray[0];
            setSeasonFilter(defaultSeason);
          }
        } catch (error) {
          console.error('Error fetching seasons:', error);
        }
      };

      fetchSeasons();
    }, []);

    // Fetch the last 14 sales data entries and calculate the cumulative difference
    useEffect(() => {
      const fetchSalesData = async () => {
        try {
          const salesCollection = collection(db, 'dailyProductSales');

          // Query Firestore for the last 14 sales documents
          const salesQuery = query(
            salesCollection,
            orderBy('timestamp', 'desc'),
            limit(14)
          );
          const salesSnapshot = await getDocs(salesQuery);

          const salesDataList = salesSnapshot.docs.map((doc) => {
            const data = doc.data() as DailySalesData;
            return data;
          });

          if (salesDataList.length >= 2) {
            // Get the earliest and latest timestamps
            const latestData = salesDataList[0];
            const earliestData = salesDataList[salesDataList.length - 1];

            // Set the period start and end dates
            setPeriodStartDate(earliestData.date);
            setPeriodEndDate(latestData.date);

            const cumulativeDifferenceData: any[] = [];

            // Collect all product IDs
            const productIds = new Set<string>();
            salesDataList.forEach((data) => {
              Object.keys(data.products).forEach((productId) => {
                productIds.add(productId);
              });
            });

            // Calculate cumulative difference for each product
            productIds.forEach((productId) => {
              const productSalesOverTime = salesDataList.map((data) => {
                const product = data.products[productId];
                if (product && product.season === seasonFilter) {
                  const totalSold = Object.values(product.colors).reduce(
                    (sum, colorData) => sum + colorData.totalSold,
                    0
                  );
                  return { date: data.date, totalSold };
                }
                return null;
              }).filter((entry) => entry !== null) as { date: string; totalSold: number }[];

              if (productSalesOverTime.length >= 2) {
                const soldDifference =
                  productSalesOverTime[0].totalSold - productSalesOverTime[productSalesOverTime.length - 1].totalSold;

                if (soldDifference !== 0) {
                  cumulativeDifferenceData.push({
                    productId,
                    productName: latestData.products[productId]?.productName || 'Unknown',
                    category: latestData.products[productId]?.category || 'Unknown',
                    totalSoldDifference: soldDifference,
                  });
                }
              }
            });

            // Sort the cumulativeDifferenceData array by totalSoldDifference descending
            cumulativeDifferenceData.sort(
              (a, b) => b.totalSoldDifference - a.totalSoldDifference
            );

            // Take the top 10 products
            const top10DifferenceData = cumulativeDifferenceData.slice(0, 10);

            setSalesDifference(top10DifferenceData);
          } else {
            console.warn('Not enough sales data to calculate difference.');
          }
        } catch (error) {
          console.error('Error fetching sales data:', error);
        }
      };

      if (seasonFilter) {
        fetchSalesData();
      }
    }, [seasonFilter]);

    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-6">Velkommen, NAVN</h1>

          {/* Season Filter */}
          <div className="mb-6">
            <label htmlFor="seasonFilter" className="mr-2 font-bold">
              Vælg Sæson:
            </label>
            <div className="relative inline-block">
              <select
                id="seasonFilter"
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="block w-full max-w-xs border border-gray-300 p-2 bg-white text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {seasonOptions.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
              {/* Dropdown Arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buying Orders Overview */}
            <div className="bg-white shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Buying Orders Overview</h2>
              <div className="grid grid-cols-5 gap-0 border border-gray-300">
                {/* Column Headers */}
                <div className="text-xs font-bold border-b border-gray-300 p-1">
                  Supplier
                </div>
                <div className="text-xs font-bold border-b border-gray-300 p-1">
                  Style
                </div>
                <div className="text-xs font-bold border-b border-gray-300 p-1">
                  Color
                </div>
                <div className="text-xs font-bold border-b border-gray-300 p-1">
                  Purchased Qty
                </div>
                <div className="text-xs font-bold border-b border-gray-300 p-1">
                  Delivery Week
                </div>

                {/* Rows for Buying Orders */}
                {buyingOrders.slice(0, 5).map((order) => (
                  <React.Fragment key={order.id}>
                    <div className="text-xs border-b border-gray-300 p-1">
                      {order.leverandor}
                    </div>
                    <div className="text-xs border-b border-gray-300 p-1">
                      {order.style}
                    </div>
                    <div className="text-xs border-b border-gray-300 p-1">
                      {order.farve}
                    </div>
                    <div className="text-xs border-b border-gray-300 p-1">
                      {order.koebtAntal}
                    </div>
                    <div className="text-xs border-b border-gray-300 p-1">
                      {order.leveringsuge}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Sales Difference Overview */}
            <div className="bg-white shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">
                Top 10 Products (Sales Difference)
              </h2>
              {periodStartDate && periodEndDate && (
                <p className="mb-4 text-sm text-gray-600">
                  Periode: {periodStartDate} - {periodEndDate}
                </p>
              )}
              {salesDifference.length > 0 ? (
                <div className="grid grid-cols-3 gap-0 border border-gray-300">
                  {/* Column Headers */}
                  <div className="text-xs font-bold border-b border-gray-300 p-1">
                    Product Name
                  </div>
                  <div className="text-xs font-bold border-b border-gray-300 p-1">
                    Category
                  </div>
                  <div className="text-xs font-bold border-b border-gray-300 p-1">
                    Sold Difference
                  </div>

                  {/* Rows for Sales Difference Data */}
                  {salesDifference.map((product) => (
                    <React.Fragment key={product.productId}>
                      <div className="text-xs border-b border-gray-300 p-1">
                        {product.productName}
                      </div>
                      <div className="text-xs border-b border-gray-300 p-1">
                        {product.category}
                      </div>
                      <div className="text-xs border-b border-gray-300 p-1">
                        {product.totalSoldDifference}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p>No sales data available for the selected criteria.</p>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-8 space-x-4">
            <Link
              to="/lagerliste"
              className="px-6 py-2 bg-blue-600 text-white transition duration-300 ease-in-out hover:bg-blue-700"
            >
              Go to Products Page
            </Link>
            <Link
              to="/orders"
              className="px-6 py-2 bg-green-600 text-white transition duration-300 ease-in-out hover:bg-green-700"
            >
              Go to Orders Page
            </Link>
            <Link
              to="/backend"
              className="px-6 py-2 bg-purple-600 text-white transition duration-300 ease-in-out hover:bg-purple-700"
            >
              Go to Backend Page
            </Link>
          </div>
        </div>
      </div>
    );
  };

  export default Home;
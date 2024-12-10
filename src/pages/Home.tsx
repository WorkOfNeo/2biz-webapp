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
  const [vendorTotals, setVendorTotals] = useState<{ [vendor: string]: number }>({});
  const [salesDifference, setSalesDifference] = useState<any[]>([]);
  const [seasonFilter, setSeasonFilter] = useState<string>(''); // Initially empty
  const [seasonOptions, setSeasonOptions] = useState<string[]>([]);
  const [periodStartDate, setPeriodStartDate] = useState<string>('');
  const [periodEndDate, setPeriodEndDate] = useState<string>('');

  // Add state for current week and year
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(0);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  // Function to format dates in Danish format (DD.MM.YYYY)
  const formatDanishDate = (date: Date): string => {
    return date.toLocaleDateString('da-DK');
  };

  // Fetch the next available delivery week based on 'leveringsuge'
  useEffect(() => {
    const fetchNextDeliveryWeek = async () => {
      try {
        const today = new Date();
        const currentWeek = getWeekNumber(today);

        // Fetch distinct 'leveringsuge's greater than or equal to current week
        const ordersRef = collection(db, 'buyingOrders');
        const q = query(
          ordersRef,
          where('leveringsuge', '>=', currentWeek),
          orderBy('leveringsuge', 'asc'),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const nextOrder = snapshot.docs[0].data();
          setCurrentWeekNumber(nextOrder.leveringsuge);
        } else {
          // If no future deliveries, get the earliest available week
          const qNextYear = query(
            ordersRef,
            orderBy('leveringsuge', 'asc'),
            limit(1)
          );
          const snapshotNextYear = await getDocs(qNextYear);
          if (!snapshotNextYear.empty) {
            const nextOrder = snapshotNextYear.docs[0].data();
            setCurrentWeekNumber(nextOrder.leveringsuge);
            setCurrentYear(currentYear + 1); // Assuming deliveries are in the next year
          }
        }
      } catch (error) {
        console.error('Error fetching next delivery week:', error);
      }
    };

    fetchNextDeliveryWeek();
  }, [currentYear]);

  // Fetch Buying Orders for the selected week
  useEffect(() => {
    const fetchBuyingOrdersForWeek = async () => {
      try {
        const ordersRef = collection(db, 'buyingOrders');
        const q = query(
          ordersRef,
          where('leveringsuge', '==', currentWeekNumber)
        );

        const ordersSnapshot = await getDocs(q);
        const ordersList = ordersSnapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            leverandor: data.leverandor || '',
            ordreDato:
              data.ordreDato && data.ordreDato.toDate
                ? data.ordreDato.toDate()
                : data.ordreDato || new Date(),
            ordreNr: data.ordreNr || '',
            style: data.style || '',
            farve: data.farve || '',
            koebtAntal: data.koebtAntal || 0,
            etaDato:
              data.etaDato && data.etaDato.toDate
                ? data.etaDato.toDate()
                : data.etaDato || new Date(),
            leveringsuge: data.leveringsuge || 0,
            saeson: data.saeson || '',
            productId: data.productId || '',
            bekraeftet: data.bekraeftet || false,
            leveret: data.leveret || 'Nej',
            kommentarer: data.kommentarer || [],
          } as BuyingOrder;
        });
        setBuyingOrders(ordersList);

        // Compute vendor totals
        const totals = ordersList.reduce((acc, order) => {
          const vendor = order.leverandor;
          const qty = order.koebtAntal || 0;
          if (acc[vendor]) {
            acc[vendor] += qty;
          } else {
            acc[vendor] = qty;
          }
          return acc;
        }, {} as { [vendor: string]: number });

        setVendorTotals(totals);
      } catch (error) {
        console.error('Error fetching buying orders:', error);
      }
    };

    if (currentWeekNumber > 0) {
      fetchBuyingOrdersForWeek();
    }
  }, [currentWeekNumber]);

  // Week navigation functions
  const incrementWeek = () => {
    const fetchNextWeek = async () => {
      try {
        const ordersRef = collection(db, 'buyingOrders');
        const q = query(
          ordersRef,
          where('leveringsuge', '>', currentWeekNumber),
          orderBy('leveringsuge', 'asc'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const nextOrder = snapshot.docs[0].data();
          setCurrentWeekNumber(nextOrder.leveringsuge);
        } else {
          // If no more weeks, loop back to the earliest week
          const qFirstWeek = query(
            ordersRef,
            orderBy('leveringsuge', 'asc'),
            limit(1)
          );
          const snapshotFirstWeek = await getDocs(qFirstWeek);
          if (!snapshotFirstWeek.empty) {
            const nextOrder = snapshotFirstWeek.docs[0].data();
            setCurrentWeekNumber(nextOrder.leveringsuge);
          }
        }
      } catch (error) {
        console.error('Error fetching next week:', error);
      }
    };

    fetchNextWeek();
  };

  const decrementWeek = () => {
    const fetchPreviousWeek = async () => {
      try {
        const ordersRef = collection(db, 'buyingOrders');
        const q = query(
          ordersRef,
          where('leveringsuge', '<', currentWeekNumber),
          orderBy('leveringsuge', 'desc'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const prevOrder = snapshot.docs[0].data();
          setCurrentWeekNumber(prevOrder.leveringsuge);
        } else {
          // If no previous weeks, loop back to the latest week
          const qLastWeek = query(
            ordersRef,
            orderBy('leveringsuge', 'desc'),
            limit(1)
          );
          const snapshotLastWeek = await getDocs(qLastWeek);
          if (!snapshotLastWeek.empty) {
            const prevOrder = snapshotLastWeek.docs[0].data();
            setCurrentWeekNumber(prevOrder.leveringsuge);
          }
        }
      } catch (error) {
        console.error('Error fetching previous week:', error);
      }
    };

    fetchPreviousWeek();
  };

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
        seasonsArray.sort();

        setSeasonOptions(seasonsArray);

        if (!seasonFilter) {
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
    // Existing code for fetching sales data remains unchanged
  }, [seasonFilter]);

  // Function to get ISO week number
  function getWeekNumber(d: Date): number {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const millisecsInDay = 86400000;
    return (
      Math.ceil(((d.getTime() - onejan.getTime()) / millisecsInDay + onejan.getDay() + 1) / 7)
    );
  }

  // Function to get the start and end dates of a given week
  function getStartAndEndDatesOfWeek(
    week: number,
    year: number
  ): { startDate: Date; endDate: Date } {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOWeekStart = new Date(simple);
    if (dayOfWeek <= 4) {
      ISOWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    const startDate = new Date(ISOWeekStart);
    const endDate = new Date(ISOWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    return { startDate, endDate };
  }

  // Get start and end dates for display
  const { startDate, endDate } = getStartAndEndDatesOfWeek(currentWeekNumber, currentYear);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Velkommen, NAVN</h1>

        {/* Dashboard content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buying Orders Overview */}
          <div className="bg-white shadow-md p-6">
            {/* Week Navigation inside the box */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Buying Orders Overview</h2>
              <div className="flex items-center">
                <button
                  onClick={decrementWeek}
                  className="px-2 py-1 bg-gray-300 rounded-md mr-2"
                >
                  Forrige Uge
                </button>
                <span className="font-bold">Uge {currentWeekNumber}</span>
                <button
                  onClick={incrementWeek}
                  className="px-2 py-1 bg-gray-300 rounded-md ml-2"
                >
                  Næste Uge
                </button>
              </div>
            </div>
            <p className="mb-2">
              {formatDanishDate(startDate)} - {formatDanishDate(endDate)}
            </p>
            {buyingOrders.length > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-0 border border-gray-300">
                  {/* Column Headers */}
                  <div className="text-xs font-bold border-b border-gray-300 p-1">
                    Leverandør
                  </div>
                  <div className="text-xs font-bold border-b border-gray-300 p-1">
                    Style
                  </div>
                  <div className="text-xs font-bold border-b border-gray-300 p-1">
                    Farve
                  </div>
                  <div className="text-xs font-bold border-b border-gray-300 p-1">
                    Købt Antal
                  </div>

                  {/* Rows for Buying Orders */}
                  {buyingOrders.map((order) => (
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
                    </React.Fragment>
                  ))}
                </div>

                {/* Display vendor totals */}
                <div className="mt-4">
                  <h3 className="text-lg font-bold mb-2">Total antal pr. leverandør</h3>
                  {Object.entries(vendorTotals).map(([vendor, total]) => (
                    <div key={vendor} className="text-sm p-1">
                      {vendor}: {total} stk
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p>Ingen købte ordrer for denne uge.</p>
            )}
          </div>

          {/* Sales Difference Overview */}
          <div className="bg-white shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Top 10 Produkter (Salg Difference)</h2>
            {periodStartDate && periodEndDate && (
              <p className="mb-4 text-sm text-gray-600">
                Periode: {periodStartDate} - {periodEndDate}
              </p>
            )}
            {salesDifference.length > 0 ? (
              <div className="grid grid-cols-3 gap-0 border border-gray-300">
                {/* Column Headers */}
                <div className="text-xs font-bold border-b border-gray-300 p-1">
                  Produktnavn
                </div>
                <div className="text-xs font-bold border-b border-gray-300 p-1">
                  Kategori
                </div>
                <div className="text-xs font-bold border-b border-gray-300 p-1">
                  Solgt Difference
                </div>

                {/* Rows for Sales Difference Data */}
                {salesDifference.map((product) => (
                  <React.Fragment key={product.productId}>
                    <div className="text-xs border-b border-gray-300 p-1">
                      <Link
                        to={`/product/${product.productId}`}
                        className="text-blue-500 hover:underline"
                      >
                        {product.productName}
                      </Link>
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
              <p>Ingen salgsdata tilgængelig for de valgte kriterier.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
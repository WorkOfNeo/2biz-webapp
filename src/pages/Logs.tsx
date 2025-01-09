// src/pages/Logs.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // Import the singleton `db`

import Sidebar from '../components/Sidebar';

interface Log {
  timestamp?: string;
  updatedProducts?: string[];
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const [openItems, setOpenItems] = useState<{ [key: number]: boolean }>({}); // State for accordion items
  const [productFilters, setProductFilters] = useState<{ [key: number]: string }>({}); // Filter state for each log

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true); // Start loading
        const logsCollection = collection(db, 'logs');
        const logsSnapshot = await getDocs(logsCollection);

        if (logsSnapshot.empty) {
          console.warn('No logs found in Firestore.');
        }

        const logsList = logsSnapshot.docs.map((doc) => {
          const data = doc.data() as Log;
          return {
            timestamp: data.timestamp || 'No timestamp available',
            updatedProducts: data.updatedProducts ?? [], // Use an empty array as a fallback
          };
        });

        // Sort logs by timestamp descending
        logsList.sort((a, b) => {
          const dateA = new Date(a.timestamp || '');
          const dateB = new Date(b.timestamp || '');
          return dateB.getTime() - dateA.getTime();
        });

        console.log('Fetched logs:', logsList); // Debug log
        setLogs(logsList);
        setError(null); // Clear any previous error
      } catch (error) {
        console.error('Error fetching logs:', error); // Log any errors
        setError('Failed to fetch logs. Please try again later.');
      } finally {
        setLoading(false); // End loading
      }
    };

    fetchLogs();
  }, []);

  // Helper function to format the timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Function to toggle accordion item
  const toggleItem = (index: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Function to handle product filter change
  const handleFilterChange = (index: number, letter: string) => {
    setProductFilters((prev) => ({
      ...prev,
      [index]: letter,
    }));
  };

  // Alphabet letters for filtering
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="flex">
      <Sidebar /> {/* Sidebar is always visible */}
      <div className="flex-1 p-8 bg-black text-white min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Sync Logs</h1>
        {loading ? (
          <p>Loading logs...</p> // Loading indicator
        ) : error ? (
          <p className="text-red-500">{error}</p> // Display error message
        ) : logs.length === 0 ? (
          <p>No logs found.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log, index) => {
              // Sort the updated products alphabetically
              const sortedProducts = log.updatedProducts
                ? [...log.updatedProducts].sort()
                : [];

              // Apply the filter to the products
              const filteredProducts =
                productFilters[index]
                  ? sortedProducts.filter((product) =>
                      product
                        .toUpperCase()
                        .startsWith(productFilters[index])
                    )
                  : sortedProducts;

              return (
                <div key={index} className="border border-gray-700">
                  <div
                    onClick={() => toggleItem(index)}
                    className="cursor-pointer flex justify-between items-center p-4 bg-gray-800 hover:bg-gray-700"
                  >
                    <span>
                      <strong>Timestamp:</strong>{' '}
                      {log.timestamp &&
                      log.timestamp !== 'No timestamp available'
                        ? formatTimestamp(log.timestamp)
                        : 'No timestamp available'}
                    </span>
                    <svg
                      className={`w-5 h-5 transform ${
                        openItems[index] ? 'rotate-180' : ''
                      } transition-transform`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                  {openItems[index] && (
                    <div className="p-4 bg-gray-900">
                      {sortedProducts.length > 0 ? (
                        <>
                          <div className="mb-4">
                            <strong>Filter by letter:</strong>
                            <div className="flex flex-wrap mt-2">
                              {alphabet.map((letter) => (
                                <button
                                  key={letter}
                                  onClick={() =>
                                    handleFilterChange(index, letter)
                                  }
                                  className={`px-2 py-1 m-1 border border-gray-700 hover:bg-gray-700 ${
                                    productFilters[index] === letter
                                      ? 'bg-gray-700'
                                      : ''
                                  }`}
                                >
                                  {letter}
                                </button>
                              ))}
                              <button
                                onClick={() =>
                                  handleFilterChange(index, '')
                                }
                                className={`px-2 py-1 m-1 border border-gray-700 hover:bg-gray-700 ${
                                  !productFilters[index] ? 'bg-gray-700' : ''
                                }`}
                              >
                                All
                              </button>
                            </div>
                          </div>
                          <ul className="list-disc pl-5 space-y-1">
                            {filteredProducts.length > 0 ? (
                              filteredProducts.map((product, idx) => (
                                <li key={idx}>{product}</li>
                              ))
                            ) : (
                              <li>No products match the filter.</li>
                            )}
                          </ul>
                        </>
                      ) : (
                        <p>No products updated.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;
// src/pages/Logs.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // Import the singleton `db`

interface Log {
  timestamp?: string;
  updatedProducts?: string[];
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state

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

  if (loading) {
    return <p>Loading logs...</p>; // Loading indicator
  }

  if (error) {
    return <p className="text-red-500">{error}</p>; // Display error message
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Sync Logs</h1>
      {logs.length === 0 ? (
        <p>No logs found.</p>
      ) : (
        <ul className="list-disc pl-6">
          {logs.map((log, index) => (
            <li key={index}>
              <strong>Timestamp:</strong> {log.timestamp} <br />
              <strong>Updated Products:</strong>{' '}
              {log.updatedProducts && log.updatedProducts.length > 0
                ? log.updatedProducts.join(', ')
                : 'No products updated'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Logs;
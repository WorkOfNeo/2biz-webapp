// src/components/UploadCSVModal.tsx

import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import Papa from 'papaparse';
import { BuyingOrder } from './types';

interface UploadCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const UploadCSVModal: React.FC<UploadCSVModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerMapping, setHeaderMapping] = useState<{ [key: string]: keyof BuyingOrder }>({});
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successCount, setSuccessCount] = useState<number>(0);

  // Define the required and optional fields in BuyingOrder
  const requiredFields: (keyof BuyingOrder)[] = ['leverandor', 'ordreDato', 'ordreNr'];
  const optionalFields: (keyof BuyingOrder)[] = [
    'type',
    'style',
    'farve',
    'koebtAntal',
    'etaDato',
    'leveringsuge',
    'leveret',
    'leveretAntal',
    'saeson',
    'productId',
  ];

  // All database fields to map
  const dbFields: (keyof BuyingOrder)[] = [...requiredFields, ...optionalFields];

  // Function to convert date from 'DD/MM/YYYY' to 'YYYY-MM-DD'
  const convertDateFormat = (dateStr: string): string => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      console.warn('Unexpected date format:', dateStr);
      return dateStr; // Return as is if format is unexpected
    }
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed');
    setError('');
    setSuccessCount(0);
    setHeaderMapping({});
    setHeaders([]);

    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      console.log('Selected file:', e.target.files[0]);

      // Parse headers only
      Papa.parse(e.target.files[0], {
        header: true,
        delimiter: ';',
        preview: 1, // Parse only the first row to get headers
        complete: (results: Papa.ParseResult<Record<string, string>>) => {
          const parsedHeaders = results.meta.fields || [];
          console.log('Extracted CSV headers:', parsedHeaders);
          setHeaders(parsedHeaders);
        },
        error: (err: Error) => {
          console.error('PapaParse Error while extracting headers:', err);
          setError(`Error parsing CSV headers: ${err.message}`);
        },
      });
    }
  };

  const handleMappingChange = (dbField: keyof BuyingOrder, csvHeader: string) => {
    setHeaderMapping((prev) => ({
      ...prev,
      [dbField]: csvHeader as keyof BuyingOrder,
    }));
  };

  const handleUpload = () => {
    if (!file) {
      setError('Please select a CSV file to upload.');
      console.log('No file selected');
      return;
    }

    // Ensure all required fields are mapped
    for (const field of requiredFields) {
      if (!headerMapping[field]) {
        setError(`Please map the required field: ${field}`);
        console.log(`Required field "${field}" is not mapped`);
        return;
      }
    }

    setUploading(true);
    console.log('Starting CSV parsing with mappings:', headerMapping);

    Papa.parse(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<Record<string, string>>) => {
        console.log('CSV parsing completed');
        const { data, errors } = results;

        console.log('Parsed data:', data);
        console.log('Parsing errors:', errors);

        if (errors.length > 0) {
          setError(`Error parsing CSV file: ${errors[0].message}`);
          console.log('Error during CSV parsing:', errors[0].message);
          setUploading(false);
          return;
        }

        // Validate and prepare data based on mappings
        const validOrders: BuyingOrder[] = [];
        for (const row of data) {
          const mappedRow: Partial<BuyingOrder> = {};

          // Map each dbField to the corresponding CSV header
          for (const dbField of dbFields) {
            const csvHeader = headerMapping[dbField];
            const value = row[csvHeader];

            if (value === undefined || value === null) {
              if (requiredFields.includes(dbField)) {
                console.log(`Required field "${dbField}" is missing in row:`, row);
                // Assign default value for required fields to pass validation
                switch (dbField) {
                  case 'leverandor':
                  case 'ordreDato':
                  case 'ordreNr':
                    mappedRow[dbField] = '';
                    break;
                  default:
                    break;
                }
              }
              continue; // Skip optional fields if not present
            }

            // Assign based on field type
            switch (dbField) {
              case 'leverandor':
              case 'ordreDato':
              case 'ordreNr':
              case 'type':
              case 'style':
              case 'farve':
              case 'saeson':
              case 'productId':
                mappedRow[dbField] = value.trim();
                break;
              case 'koebtAntal':
              case 'leveringsuge':
              case 'leveretAntal':
                mappedRow[dbField] = Number(value) || 0;
                break;
              case 'leveret':
                const val = value.toLowerCase();
                if (val === 'ja' || val === 'nej' || val === 'delvist') {
                  mappedRow[dbField] = (val.charAt(0).toUpperCase() + val.slice(1)) as 'Ja' | 'Nej' | 'Delvist';
                } else {
                  mappedRow[dbField] = 'Nej'; // Default value
                }
                break;
              case 'etaDato':
                // Convert date format from DD/MM/YYYY to YYYY-MM-DD
                const convertedDate = convertDateFormat(value);
                mappedRow[dbField] = convertedDate;
                break;
              default:
                break;
            }

            console.log(`Mapped "${csvHeader}" to "${dbField}" with value "${mappedRow[dbField]}"`);
          }

          // Basic validation for required fields
          if (!mappedRow.leverandor || !mappedRow.ordreDato || !mappedRow.ordreNr) {
            console.log('Skipping invalid row (missing required fields):', row);
            continue;
          }

          // Assign default values if necessary
          mappedRow.type = mappedRow.type || '';
          mappedRow.style = mappedRow.style || '';
          mappedRow.farve = mappedRow.farve || '';
          mappedRow.saeson = mappedRow.saeson || '';
          mappedRow.productId = mappedRow.productId || '';
          mappedRow.leveret = mappedRow.leveret || 'Nej';

          console.log('Valid order to upload:', mappedRow);

          validOrders.push(mappedRow as BuyingOrder);
        }

        console.log('Total valid orders to upload:', validOrders.length);

        if (validOrders.length === 0) {
          setError('No valid orders found in the CSV file.');
          console.log('No valid orders found');
          setUploading(false);
          return;
        }

        try {
          const ordersRef = collection(db, 'buyingOrders');
          let uploadedCount = 0;

          // Firestore allows batch writes of up to 500 operations
          const batchSize = 500;
          for (let i = 0; i < validOrders.length; i += batchSize) {
            const batch = validOrders.slice(i, i + batchSize);
            console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}: ${batch.length} orders`);

            const writeBatchObj = writeBatch(db);

            batch.forEach((order) => {
              const docRef = doc(ordersRef);
              writeBatchObj.set(docRef, order);
              console.log('Queued order for upload:', order);
            });

            await writeBatchObj.commit();
            console.log(`Batch ${Math.floor(i / batchSize) + 1} uploaded successfully`);
            uploadedCount += batch.length;
          }

          setSuccessCount(uploadedCount);
          setUploading(false);
          onUploadComplete();
          console.log(`Successfully uploaded ${uploadedCount} orders`);
          onClose();
        } catch (uploadError: any) {
          console.error('Error uploading orders:', uploadError);
          setError(`Error uploading orders: ${uploadError.message}`);
          setUploading(false);
        }
      }, // Replace the semicolon here with a comma
      error: (err: Error) => {
        console.error('PapaParse Error:', err);
        setError(`Error parsing CSV file: ${err.message}`);
        setUploading(false);
      },
    }); // Close Papa.parse
  }; // Add this closing brace to close the handleUpload function

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Upload CSV</h2>

        {error && <p className="text-red-500 mb-2">{error}</p>}
        {successCount > 0 && (
          <p className="text-green-500 mb-2">Successfully uploaded {successCount} orders.</p>
        )}

        {!headers.length && (
          <>
            <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />

            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
                disabled={uploading || !file}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </>
        )}

        {headers.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2">Map CSV Headers to Database Fields</h3>
            <form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dbFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <select
                      value={headerMapping[field] || ''}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">-- Select CSV Header --</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </form>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setHeaderMapping({});
                  setHeaders([]);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
                disabled={uploading}
              >
                Reset
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
                disabled={uploading || !file}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadCSVModal;
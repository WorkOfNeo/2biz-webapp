// src/pages/BuyingOrders.tsx

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import UploadCSVModal from '../components/UploadCSVModal';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { BuyingOrder, Product } from '../components/types';
import { debounce } from 'lodash';

const BuyingOrders: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [buyingOrders, setBuyingOrders] = useState<BuyingOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newOrderRow, setNewOrderRow] = useState<BuyingOrder>({
    leverandor: '',
    ordreDato: '', // Initialize as empty string
    ordreNr: '',
    type: '',
    style: '',
    farve: '',
    koebtAntal: 0,
    etaDato: '', // Initialize as empty string
    leveringsuge: 0,
    bekraeftet: false,
    leveret: 'Nej',
    kommentarer: [],
    leveretAntal: 0,
    saeson: '',
    productId: '',
  });

  // Define the columns with labels
  const columns = [
    { field: 'leverandor', label: 'Leverandør' },
    { field: 'ordreDato', label: 'Ordre dato' },
    { field: 'ordreNr', label: 'Ordre nr' },
    { field: 'type', label: 'Type' },
    { field: 'style', label: 'Style' },
    { field: 'farve', label: 'Farve' },
    { field: 'koebtAntal', label: 'Købt' },
    { field: 'etaDato', label: 'ETA' },
    { field: 'leveringsuge', label: 'Leveringsuge' },
    { field: 'bekraeftet', label: 'Bekræftet' },
    { field: 'leveret', label: 'Leveret' },
    { field: 'kommentarer', label: 'Kommentar' },
    { field: 'leveretAntal', label: 'Leveret antal' },
    { field: 'saeson', label: 'Sæson' },
  ];

  // State to track visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map((col) => col.field)
  );

  // Function to handle column visibility change
  const handleColumnToggle = (field: string) => {
    setVisibleColumns((prevVisibleColumns) => {
      if (prevVisibleColumns.includes(field)) {
        // Remove the column
        return prevVisibleColumns.filter((col) => col !== field);
      } else {
        // Add the column
        return [...prevVisibleColumns, field];
      }
    });
  };

  // Fetch buying orders
  const fetchBuyingOrders = async () => {
    try {
      const ordersRef = collection(db, 'buyingOrders');
      const ordersSnapshot = await getDocs(ordersRef);
      const ordersList = ordersSnapshot.docs.map((doc) => {
        const data = doc.data();

        // Since ordreDato and etaDato are stored as strings, no need to call toDate()
        const ordreDato = data.ordreDato || '';
        const etaDato = data.etaDato || '';

        return {
          id: doc.id,
          leverandor: data.leverandor || '',
          ordreDato: ordreDato,
          ordreNr: data.ordreNr || '',
          type: data.type || '',
          style: data.style || '',
          farve: data.farve || '',
          koebtAntal: data.koebtAntal || 0,
          etaDato: etaDato,
          leveringsuge:
            data.leveringsuge || calculateDeliveryWeek(etaDato),
          bekraeftet: data.bekraeftet || false,
          leveret: data.leveret || 'Nej',
          kommentarer: data.kommentarer || [],
          leveretAntal: data.leveretAntal || 0,
          saeson: data.saeson || '',
          productId: data.productId || '',
        } as BuyingOrder;
      });
      setBuyingOrders(ordersList);
    } catch (error) {
      console.error('Error fetching buying orders:', error);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const productsList = productsSnapshot.docs.map(
        (doc) =>
          ({
            ...doc.data(),
            id: doc.id,
          } as Product)
      );
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Handle adding a new buying order to Firestore
  const handleAddOrder = async (newOrder: BuyingOrder) => {
    try {
      // Prepare the data to save to Firestore
      const orderData = {
        ...newOrder,
        ordreDato: newOrder.ordreDato || '',
        etaDato: newOrder.etaDato || '',
      };

      const ordersRef = collection(db, 'buyingOrders');
      await addDoc(ordersRef, orderData);
      fetchBuyingOrders(); // Refresh the list after adding a new order
    } catch (error) {
      console.error('Error adding buying order:', error);
    }
  };

  // Handle input changes in the new row
  const handleRowChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: string
  ) => {
    let value: any =
      e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;

    if (field === 'ordreDato' || field === 'etaDato') {
      // Keep value as string (YYYY-MM-DD)
    } else if (
      field === 'koebtAntal' ||
      field === 'leveringsuge' ||
      field === 'leveretAntal'
    ) {
      value = parseInt(value, 10) || 0;
    } else if (field === 'bekraeftet') {
      value = (e.target as HTMLInputElement).checked;
    } else if (field === 'kommentarer') {
      value = value.split(',').map((s: string) => s.trim());
    } else {
      // For all other fields, ensure value is a string
      value = String(value);
    }

    setNewOrderRow((prevRow) => ({
      ...prevRow,
      [field]: value,
    }));
  };

  // Handle adding a new row
  const handleAddRow = () => {
    // Add the new order to Firestore
    handleAddOrder(newOrderRow);

    // Reset the newOrderRow state
    setNewOrderRow({
      leverandor: '',
      ordreDato: '',
      ordreNr: '',
      type: '',
      style: '',
      farve: '',
      koebtAntal: 0,
      etaDato: '',
      leveringsuge: 0,
      bekraeftet: false,
      leveret: 'Nej',
      kommentarer: [],
      leveretAntal: 0,
      saeson: '',
      productId: '',
    });
  };

  // Calculate delivery week from ETA date string
  const calculateDeliveryWeek = (dateString: string): number => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor(
      (date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000)
    );
    return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  };

  useEffect(() => {
    fetchProducts();
    fetchBuyingOrders();
  }, []);

  // Debounced function for updating the database
  const debouncedUpdate = useCallback(
    debounce(async (orderId: string, field: string, value: any) => {
      // Prepare the updated value
      let updatedValue: any = value;

      // Handle special cases
      if (
        field === 'koebtAntal' ||
        field === 'leveringsuge' ||
        field === 'leveretAntal'
      ) {
        updatedValue = parseInt(value as string, 10) || 0;
      } else if (field === 'bekraeftet') {
        updatedValue = value;
      } else if (field === 'ordreDato' || field === 'etaDato') {
        // Keep as string
        updatedValue = value as string;
      } else if (field === 'kommentarer') {
        updatedValue = (value as string).split(',').map((s) => s.trim());
      } else {
        // For all other fields, ensure updatedValue is a string
        updatedValue = String(value);
      }

      try {
        const orderRef = doc(db, 'buyingOrders', orderId);
        await updateDoc(orderRef, {
          [field]: updatedValue,
        });
        console.log(`Order ${orderId} updated: ${field} = ${updatedValue}`);
      } catch (error) {
        console.error('Error updating order:', error);
      }
    }, 500),
    []
  );

  // Handle inline editing and update state immediately
  const handleCellChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    orderId: string,
    field: string
  ) => {
    const value =
      e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;

    setBuyingOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, [field]: value } : order
      )
    );

    // Call the debounced database update
    debouncedUpdate(orderId, field, value);
  };

  // New state to control the CSV upload modal
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  // Function to handle upload completion
  const handleUploadComplete = () => {
    fetchBuyingOrders(); // Refresh data after upload
    setIsCSVModalOpen(false); // Close the modal
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Buying Orders</h1>

        {/* Buttons for actions */}
        <div className="flex space-x-4 mb-4">
          {/* Button to open the CSV upload modal */}
          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Upload CSV
          </button>

          {/* Other buttons can go here */}
        </div>

        {/* Include the UploadCSVModal component */}
        <UploadCSVModal
          isOpen={isCSVModalOpen}
          onClose={() => setIsCSVModalOpen(false)}
          onUploadComplete={handleUploadComplete}
        />

        {/* Checkboxes to toggle columns */}
        <div className="mb-4">
          <label className="mr-2 font-bold">Vælg kolonner:</label>
          <div className="flex flex-wrap">
            {columns.map((column) => (
              <label
                key={column.field}
                className="mr-4 mb-2 flex items-center space-x-1"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.field)}
                  onChange={() => handleColumnToggle(column.field)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="text-sm">{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Display Buying Orders in a Table Layout */}
        <div className="mt-12 overflow-x-auto">
          <h2 className="text-2xl font-bold mb-4">Eksisterende Ordrer</h2>
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                {columns
                  .filter((column) => visibleColumns.includes(column.field))
                  .map((column) => (
                    <th
                      key={column.field}
                      className="text-xs font-bold border border-gray-300 p-1"
                    >
                      {column.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {/* Rows for Buying Orders */}
              {buyingOrders.map((order) => (
                <tr key={order.id}>
                  {columns
                    .filter((column) => visibleColumns.includes(column.field))
                    .map((column) => {
                      let cellValue = order[column.field as keyof BuyingOrder];

                      // Render editable cells
                      let inputElement;
                      const field = column.field;

                      if (field === 'ordreDato' || field === 'etaDato') {
                        // Date fields
                        inputElement = (
                          <input
                            type="date"
                            value={(cellValue as string) || ''}
                            onChange={(e) =>
                              handleCellChange(e, order.id!, field)
                            }
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          />
                        );
                      } else if (field === 'bekraeftet') {
                        // Checkbox field
                        inputElement = (
                          <input
                            type="checkbox"
                            checked={cellValue as boolean}
                            onChange={(e) =>
                              handleCellChange(e, order.id!, field)
                            }
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          />
                        );
                      } else if (field === 'leveret') {
                        // Select field
                        inputElement = (
                          <select
                            value={cellValue as string}
                            onChange={(e) =>
                              handleCellChange(e, order.id!, field)
                            }
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          >
                            <option value="Ja">Ja</option>
                            <option value="Nej">Nej</option>
                            <option value="Delvist">Delvist</option>
                          </select>
                        );
                      } else if (
                        field === 'koebtAntal' ||
                        field === 'leveringsuge' ||
                        field === 'leveretAntal'
                      ) {
                        // Number fields
                        inputElement = (
                          <input
                            type="number"
                            value={cellValue as number}
                            onChange={(e) =>
                              handleCellChange(e, order.id!, field)
                            }
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          />
                        );
                      } else if (field === 'kommentarer') {
                        // Text area for comments
                        inputElement = (
                          <input
                            type="text"
                            value={(cellValue as string[]).join(', ')}
                            onChange={(e) =>
                              handleCellChange(e, order.id!, field)
                            }
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          />
                        );
                      } else {
                        // Default text fields
                        let inputValue:
                          | string
                          | number
                          | readonly string[]
                          | undefined;

                        if (
                          typeof cellValue === 'string' ||
                          typeof cellValue === 'number' ||
                          Array.isArray(cellValue)
                        ) {
                          inputValue = cellValue;
                        } else if (
                          cellValue === undefined ||
                          cellValue === null
                        ) {
                          inputValue = '';
                        } else {
                          inputValue = String(cellValue);
                        }

                        inputElement = (
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) =>
                              handleCellChange(e, order.id!, field)
                            }
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          />
                        );
                      }

                      return (
                        <td
                          key={`${order.id}-${field}`}
                          className="text-xs border border-gray-300 p-1"
                        >
                          {inputElement}
                        </td>
                      );
                    })}
                </tr>
              ))}

              {/* New Row for Adding Order */}
              <tr>
                {columns
                  .filter((column) => visibleColumns.includes(column.field))
                  .map((column) => {
                    let inputElement;
                    const field = column.field;
                    const fieldValue = newOrderRow[field as keyof BuyingOrder];

                    if (field === 'ordreDato' || field === 'etaDato') {
                      inputElement = (
                        <input
                          type="date"
                          value={(fieldValue as string) || ''}
                          onChange={(e) => handleRowChange(e, field)}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                        />
                      );
                    } else if (field === 'bekraeftet') {
                      inputElement = (
                        <input
                          type="checkbox"
                          checked={fieldValue as boolean}
                          onChange={(e) => handleRowChange(e, field)}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                        />
                      );
                    } else if (field === 'leveret') {
                      inputElement = (
                        <select
                          value={fieldValue as string}
                          onChange={(e) => handleRowChange(e, field)}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                        >
                          <option value="Ja">Ja</option>
                          <option value="Nej">Nej</option>
                          <option value="Delvist">Delvist</option>
                        </select>
                      );
                    } else if (
                      field === 'koebtAntal' ||
                      field === 'leveringsuge' ||
                      field === 'leveretAntal'
                    ) {
                      inputElement = (
                        <input
                          type="number"
                          value={fieldValue as number}
                          onChange={(e) => handleRowChange(e, field)}
                          placeholder={column.label}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                        />
                      );
                    } else if (field === 'kommentarer') {
                      inputElement = (
                        <input
                          type="text"
                          value={(fieldValue as string[]).join(', ')}
                          onChange={(e) => handleRowChange(e, field)}
                          placeholder={column.label}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                        />
                      );
                    } else {
                      // Default text fields
                      let inputValue:
                        | string
                        | number
                        | readonly string[]
                        | undefined;

                      if (
                        typeof fieldValue === 'string' ||
                        typeof fieldValue === 'number' ||
                        Array.isArray(fieldValue)
                      ) {
                        inputValue = fieldValue;
                      } else if (
                        fieldValue === undefined ||
                        fieldValue === null
                      ) {
                        inputValue = '';
                      } else {
                        inputValue = String(fieldValue);
                      }

                      inputElement = (
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => handleRowChange(e, field)}
                          placeholder={column.label}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                        />
                      );
                    }

                    return (
                      <td key={field} className="border border-gray-300 p-1">
                        {inputElement}
                      </td>
                    );
                  })}
              </tr>
            </tbody>
          </table>

          {/* Add Row Button */}
          <button
            onClick={handleAddRow}
            className="w-full mt-4 bg-green-500 text-white p-2 rounded-md"
          >
            Tilføj Ordre
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyingOrders;
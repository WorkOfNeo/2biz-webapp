// src/components/OrderTable.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { BuyingOrder } from './types';
import { debounce } from 'lodash';

const OrderTable: React.FC = () => {
  const [buyingOrders, setBuyingOrders] = useState<BuyingOrder[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'leverandor', 'ordreDato', 'ordreNr', 'type', 'style', 'farve',
    'koebtAntal', 'etaDato', 'leveringsuge', 'bekraeftet'
  ]);
  const [newOrderRow, setNewOrderRow] = useState<BuyingOrder>({
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

  const [sortColumn, setSortColumn] = useState<string>('ordreDato');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Ref to store input and select elements for arrow key navigation
  const inputRefs = useRef<{ [key: string]: HTMLElement | null }>({});

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
    // Initially unchecked columns
    { field: 'leveret', label: 'Leveret' },
    { field: 'kommentarer', label: 'Kommentar' },
    { field: 'leveretAntal', label: 'Leveret antal' },
    { field: 'saeson', label: 'Sæson' },
  ];

  // Function to handle column visibility change
  const handleColumnToggle = (field: string) => {
    setVisibleColumns(prev =>
      prev.includes(field) ? prev.filter(col => col !== field) : [...prev, field]
    );
  };

  // Fetch buying orders
  const fetchBuyingOrders = async () => {
    try {
      const ordersRef = collection(db, 'buyingOrders');
      const ordersSnapshot = await getDocs(ordersRef);
      const ordersList: BuyingOrder[] = ordersSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          leverandor: data.leverandor || '',
          ordreDato: data.ordreDato || '',
          ordreNr: data.ordreNr || '',
          type: data.type || '',
          style: data.style || '',
          farve: data.farve || '',
          koebtAntal: typeof data.koebtAntal === 'number' ? data.koebtAntal : 0,
          etaDato: data.etaDato || '',
          leveringsuge: typeof data.leveringsuge === 'number' ? data.leveringsuge : calculateDeliveryWeek(data.etaDato || ''),
          bekraeftet: typeof data.bekraeftet === 'boolean' ? data.bekraeftet : false,
          leveret: data.leveret || 'Nej',
          kommentarer: Array.isArray(data.kommentarer) ? data.kommentarer : [],
          leveretAntal: typeof data.leveretAntal === 'number' ? data.leveretAntal : 0,
          saeson: data.saeson || '',
          productId: data.productId || '',
        };
      });
      setBuyingOrders(ordersList);

      // Extract unique suppliers
      const supplierSet = new Set(ordersList.map(order => order.leverandor));
      setSuppliers(['All', ...Array.from(supplierSet)]);
    } catch (error) {
      console.error('Error fetching buying orders:', error);
    }
  };

  useEffect(() => {
    fetchBuyingOrders();
  }, []);

  // Handle adding a new buying order to Firestore
  const handleAddOrder = async (newOrder: BuyingOrder) => {
    try {
      const orderData = {
        ...newOrder,
        ordreDato: newOrder.ordreDato || '',
        etaDato: newOrder.etaDato || '',
      };

      console.log('Adding order:', orderData);

      const ordersRef = collection(db, 'buyingOrders');
      const docRef = await addDoc(ordersRef, orderData);
      console.log('Document written with ID: ', docRef.id);
      fetchBuyingOrders();
    } catch (error: any) {
      console.error('Error adding buying order:', error);
      if (error.code) {
        console.error(`FirebaseError Code: ${error.code}`);
        console.error(`FirebaseError Message: ${error.message}`);
      }
    }
  };

  // Handle input changes in the new row
  const handleRowChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: string
  ) => {
    let value: any =
      e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;

    if (field === 'ordreDato' || field === 'etaDato') {
      // Keep value as string (YYYY-MM-DD)
    } else if (['koebtAntal', 'leveringsuge', 'leveretAntal'].includes(field)) {
      value = parseInt(value, 10) || 0;
    } else if (field === 'kommentarer') {
      value = value.split(',').map((s: string) => s.trim());
    } else {
      value = String(value);
    }

    setNewOrderRow(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle adding a new row
  const handleAddRow = () => {
    // Validate required fields
    if (!newOrderRow.leverandor || !newOrderRow.ordreDato || !newOrderRow.ordreNr) {
      alert('Please fill in all required fields: Leverandør, Ordre dato, and Ordre nr.');
      return;
    }

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

  // Debounced function for updating the database
  const debouncedUpdate = useCallback(
    debounce(async (orderId: string, field: string, value: any) => {
      let updatedValue: any = value;

      if (['koebtAntal', 'leveringsuge', 'leveretAntal'].includes(field)) {
        updatedValue = parseInt(value as string, 10) || 0;
      } else if (field === 'bekraeftet') {
        updatedValue = value;
      } else if (['ordreDato', 'etaDato'].includes(field)) {
        updatedValue = value as string;
      } else if (field === 'kommentarer') {
        updatedValue = (value as string).split(',').map(s => s.trim());
      } else {
        updatedValue = String(value);
      }

      try {
        const orderRef = doc(db, 'buyingOrders', orderId);
        await updateDoc(orderRef, {
          [field]: updatedValue,
        });
        console.log(`Order ${orderId} updated: ${field} = ${updatedValue}`);
      } catch (error: any) {
        console.error('Error updating order:', error);
        if (error.code) {
          console.error(`FirebaseError Code: ${error.code}`);
          console.error(`FirebaseError Message: ${error.message}`);
        }
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
      e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;

    setBuyingOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
      )
    );

    debouncedUpdate(orderId, field, value);
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle sort direction
      setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      // New column, reset to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort orders
  const filteredOrders = buyingOrders.filter(order => {
    const supplierMatch = selectedSupplier === 'All' || order.leverandor === selectedSupplier;
    const styleMatch = order.style.toLowerCase().includes(searchTerm.toLowerCase());
    return supplierMatch && styleMatch;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aValue = a[sortColumn as keyof BuyingOrder];
    let bValue = b[sortColumn as keyof BuyingOrder];

    if (sortColumn === 'ordreDato' || sortColumn === 'etaDato') {
      const dateA = new Date(aValue as string);
      const dateB = new Date(bValue as string);
      return sortDirection === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? (aValue as string).localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue as string);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }

    return 0;
  });

  // Handle arrow key navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    const key = e.key;
    let newRowIndex = rowIndex;
    let newColIndex = colIndex;

    if (key === 'ArrowUp') {
      newRowIndex = Math.max(0, rowIndex - 1);
    } else if (key === 'ArrowDown') {
      newRowIndex = Math.min(sortedOrders.length, rowIndex + 1); // Include new row
    } else if (key === 'ArrowLeft') {
      newColIndex = Math.max(0, colIndex - 1);
    } else if (key === 'ArrowRight') {
      newColIndex = Math.min(visibleColumns.length - 1, colIndex + 1);
    } else {
      return; // Let other keys be handled normally
    }

    e.preventDefault();

    const nextInputKey = `${newRowIndex}-${newColIndex}`;
    const nextInput = inputRefs.current[nextInputKey];
    if (nextInput) {
      nextInput.focus();
    }
  };

  return (
    <div>
      {/* Supplier Tabs */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Leverandør</h2>
        <div className="flex flex-wrap">
          {suppliers.map(supplier => (
            <button
              key={supplier}
              onClick={() => setSelectedSupplier(supplier)}
              className={`px-4 py-2 m-1 rounded-md ${
                selectedSupplier === supplier ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {supplier}
            </button>
          ))}
        </div>
      </div>

      {/* Column Visibility Checkboxes */}
      <div className="mb-4">
        <label className="mr-2 font-bold">Vælg kolonner:</label>
        <div className="flex flex-wrap">
          {columns.map(column => (
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

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Søg efter style..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-gray-300 rounded-md w-full"
        />
      </div>

      {/* Order Table */}
      <div className="mt-12 overflow-x-auto">
        <h2 className="text-2xl font-bold mb-4">Eksisterende Ordrer</h2>
        <table className="w-full table-auto border-collapse biz_buing_table">
          <thead>
            <tr>
              {columns
                .filter(column => visibleColumns.includes(column.field))
                .map((column, colIndex) => (
                  <th
                    key={column.field}
                    className="text-xs font-bold border border-gray-300 p-1 cursor-pointer biz_cell_head"
                    onClick={() => handleSort(column.field)}
                  >
                    {column.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order, rowIndex) => (
              <tr key={order.id}>
                {columns
                  .filter(column => visibleColumns.includes(column.field))
                  .map((column, colIndex) => {
                    const field = column.field;
                    const cellValue = order[field as keyof BuyingOrder];
                    const inputKey = `${rowIndex}-${colIndex}`;
                    const inputRef = (el: HTMLElement | null) => {
                      inputRefs.current[inputKey] = el;
                    };
                    let inputElement;

                    switch (field) {
                      case 'ordreDato':
                      case 'etaDato':
                        inputElement = (
                          <input
                            ref={inputRef}
                            type="date"
                            value={cellValue as string}
                            onChange={(e) => handleCellChange(e, order.id!, field)}
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          />
                        );
                        break;
                      case 'bekraeftet':
                        inputElement = (
                          <input
                            ref={inputRef}
                            type="checkbox"
                            checked={cellValue as boolean}
                            onChange={(e) => handleCellChange(e, order.id!, field)}
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          />
                        );
                        break;
                      case 'leveret':
                        inputElement = (
                          <select
                            ref={inputRef}
                            value={cellValue as string}
                            onChange={(e) => handleCellChange(e, order.id!, field)}
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          >
                            <option value="Ja">Ja</option>
                            <option value="Nej">Nej</option>
                            <option value="Delvist">Delvist</option>
                          </select>
                        );
                        break;
                      case 'koebtAntal':
                      case 'leveringsuge':
                      case 'leveretAntal':
                        inputElement = (
                          <input
                            ref={inputRef}
                            type="number"
                            value={cellValue as number}
                            onChange={(e) => handleCellChange(e, order.id!, field)}
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          />
                        );
                        break;
                      case 'kommentarer':
                        inputElement = (
                          <input
                            ref={inputRef}
                            type="text"
                            value={(cellValue as string[]).join(', ')}
                            onChange={(e) => handleCellChange(e, order.id!, field)}
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          />
                        );
                        break;
                      default:
                        inputElement = (
                          <input
                            ref={inputRef}
                            type="text"
                            value={
                              typeof cellValue === 'string' || typeof cellValue === 'number'
                                ? cellValue
                                : ''
                            }
                            onChange={(e) => handleCellChange(e, order.id!, field)}
                            className="w-full p-1 bg-transparent text-xs focus:outline-none"
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
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
                .filter(column => visibleColumns.includes(column.field))
                .map((column, colIndex) => {
                  const field = column.field;
                  const fieldValue = newOrderRow[field as keyof BuyingOrder];
                  const rowIndex = sortedOrders.length; // The new row index
                  const inputKey = `${rowIndex}-${colIndex}`;
                  const inputRef = (el: HTMLElement | null) => {
                    inputRefs.current[inputKey] = el;
                  };
                  let inputElement;

                  switch (field) {
                    case 'ordreDato':
                    case 'etaDato':
                      inputElement = (
                        <input
                          ref={inputRef}
                          type="date"
                          value={fieldValue as string}
                          onChange={(e) => handleRowChange(e, field)}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        />
                      );
                      break;
                    case 'bekraeftet':
                      inputElement = (
                        <input
                          ref={inputRef}
                          type="checkbox"
                          checked={fieldValue as boolean}
                          onChange={(e) => handleRowChange(e, field)}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        />
                      );
                      break;
                    case 'leveret':
                      inputElement = (
                        <select
                          ref={inputRef}
                          value={fieldValue as string}
                          onChange={(e) => handleRowChange(e, field)}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        >
                          <option value="Ja">Ja</option>
                          <option value="Nej">Nej</option>
                          <option value="Delvist">Delvist</option>
                        </select>
                      );
                      break;
                    case 'koebtAntal':
                    case 'leveringsuge':
                    case 'leveretAntal':
                      inputElement = (
                        <input
                          ref={inputRef}
                          type="number"
                          value={fieldValue as number}
                          onChange={(e) => handleRowChange(e, field)}
                          placeholder={column.label}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        />
                      );
                      break;
                    case 'kommentarer':
                      inputElement = (
                        <input
                          ref={inputRef}
                          type="text"
                          value={(fieldValue as string[]).join(', ')}
                          onChange={(e) => handleRowChange(e, field)}
                          placeholder={column.label}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        />
                      );
                      break;
                    default:
                      inputElement = (
                        <input
                          ref={inputRef}
                          type="text"
                          value={
                            typeof fieldValue === 'string' || typeof fieldValue === 'number'
                              ? fieldValue
                              : ''
                          }
                          onChange={(e) => handleRowChange(e, field)}
                          placeholder={column.label}
                          className="w-full p-1 bg-transparent text-xs focus:outline-none"
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        />
                      );
                  }

                  return (
                    <td key={field} className="border border-gray-300 p-1 biz_cell">
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
  );
};

export default OrderTable;
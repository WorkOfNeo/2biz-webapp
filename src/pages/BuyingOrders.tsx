// src/pages/BuyingOrders.tsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import AddBuyingOrderForm from '../components/AddBuyingOrderForm';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { BuyingOrder, Product } from '../components/types';

const BuyingOrders: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [buyingOrders, setBuyingOrders] = useState<BuyingOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newOrderRow, setNewOrderRow] = useState<BuyingOrder>({
    leverandor: '',
    ordreDato: new Date(),
    ordreNr: '',
    style: '',
    farve: '',
    koebtAntal: 0,
    etaDato: new Date(),
    leveringsuge: 0,
    saeson: '',
    productId: '',
    bekraeftet: false,
    leveret: 'Nej',
    kommentarer: [],
  });

  // Fetch buying orders
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

  // Fetch products
  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const productsList = productsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as Product));
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Handle adding a new buying order to Firestore
  const handleAddOrder = async (newOrder: BuyingOrder) => {
    try {
      const ordersRef = collection(db, 'buyingOrders');
      await addDoc(ordersRef, newOrder);
      fetchBuyingOrders(); // Refresh the list after adding a new order
    } catch (error) {
      console.error('Error adding buying order:', error);
    }
  };

  // Add empty row
  const handleAddRow = () => {
    setNewOrderRow({
      leverandor: '',
      ordreDato: new Date(),
      ordreNr: '',
      style: '',
      farve: '',
      koebtAntal: 0,
      etaDato: new Date(),
      leveringsuge: 0,
      saeson: '',
      productId: '',
      bekraeftet: false,
      leveret: 'Nej',
      kommentarer: [],
    });
  };

  // Handle input changes in the new row
  const handleRowChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    setNewOrderRow((prevRow) => ({
      ...prevRow,
      [field]: e.target.value,
    }));
  };

  useEffect(() => {
    fetchProducts();
    fetchBuyingOrders();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Buying Orders</h1>

        {/* Button to toggle form */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          {showForm ? 'Luk' : 'Tilføj Ny Ordre'}
        </button>

        {/* Toggle Add Order Form */}
        {showForm && (
          <AddBuyingOrderForm
            products={products} // Passing the products to the form
            onOrderAdded={handleAddOrder} // Passing the function to handle the form submission
          />
        )}

        {/* Display Buying Orders in a Grid Layout */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Eksisterende Ordrer</h2>
          <div className="grid grid-cols-8 gap-0 border border-gray-300">
            {/* Column Headers */}
            <div className="text-xs font-bold border-b border-gray-300 p-1">Ordre Nr</div>
            <div className="text-xs font-bold border-b border-gray-300 p-1">Leverandør</div>
            <div className="text-xs font-bold border-b border-gray-300 p-1">Style</div>
            <div className="text-xs font-bold border-b border-gray-300 p-1">Farve</div>
            <div className="text-xs font-bold border-b border-gray-300 p-1">Købt Antal</div>
            <div className="text-xs font-bold border-b border-gray-300 p-1">ETA Dato</div>
            <div className="text-xs font-bold border-b border-gray-300 p-1">Leveringsuge</div>
            <div className="text-xs font-bold border-b border-gray-300 p-1">Sæson</div>

            {/* Rows for Buying Orders */}
            {buyingOrders.map((order) => (
              <React.Fragment key={order.id}>
                <div className="text-xs border-b border-gray-300 p-1">{order.ordreNr}</div>
                <div className="text-xs border-b border-gray-300 p-1">{order.leverandor}</div>
                <div className="text-xs border-b border-gray-300 p-1">{order.style}</div>
                <div className="text-xs border-b border-gray-300 p-1">{order.farve}</div>
                <div className="text-xs border-b border-gray-300 p-1">{order.koebtAntal}</div>
                <div className="text-xs border-b border-gray-300 p-1">{order.etaDato.toDateString()}</div>
                <div className="text-xs border-b border-gray-300 p-1">{order.leveringsuge}</div>
                <div className="text-xs border-b border-gray-300 p-1">{order.saeson}</div>
              </React.Fragment>
            ))}

            {/* New Row for Adding Order */}
            <React.Fragment>
              <div>
                <input
                  type="text"
                  value={newOrderRow.ordreNr}
                  onChange={(e) => handleRowChange(e, 'ordreNr')}
                  placeholder="Ordre Nr"
                  className="w-full border border-gray-300 p-1 bg-transparent text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newOrderRow.leverandor}
                  onChange={(e) => handleRowChange(e, 'leverandor')}
                  placeholder="Leverandør"
                  className="w-full border border-gray-300 p-1 bg-transparent text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newOrderRow.style}
                  onChange={(e) => handleRowChange(e, 'style')}
                  placeholder="Style"
                  className="w-full border border-gray-300 p-1 bg-transparent text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newOrderRow.farve}
                  onChange={(e) => handleRowChange(e, 'farve')}
                  placeholder="Farve"
                  className="w-full border border-gray-300 p-1 bg-transparent text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={newOrderRow.koebtAntal}
                  onChange={(e) => handleRowChange(e, 'koebtAntal')}
                  placeholder="Købt Antal"
                  className="w-full border border-gray-300 p-1 bg-transparent text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={newOrderRow.etaDato.toISOString().split('T')[0]}
                  onChange={(e) => handleRowChange(e, 'etaDato')}
                  className="w-full border border-gray-300 p-1 bg-transparent text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={newOrderRow.leveringsuge}
                  onChange={(e) => handleRowChange(e, 'leveringsuge')}
                  placeholder="Leveringsuge"
                  className="w-full border border-gray-300 p-1 bg-transparent text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newOrderRow.saeson}
                  onChange={(e) => handleRowChange(e, 'saeson')}
                  placeholder="Sæson"
                  className="w-full border border-gray-300 p-1 bg-transparent text-xs focus:outline-none"
                />
              </div>
            </React.Fragment>
          </div>

          {/* Add Row Button */}
          <button
            onClick={handleAddRow}
            className="w-full mt-4 bg-green-500 text-white p-2 rounded-md"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyingOrders;
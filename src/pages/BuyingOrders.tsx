// src/pages/BuyingOrders.tsx

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import AddBuyingOrderForm from '../components/AddBuyingOrderForm';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { BuyingOrder, Product } from '../components/types';

const BuyingOrders: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [buyingOrders, setBuyingOrders] = useState<BuyingOrder[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Fetch buying orders
  const fetchBuyingOrders = async () => {
    try {
      const ordersRef = collection(db, 'buyingOrders');
      const ordersSnapshot = await getDocs(ordersRef);
      const ordersList = ordersSnapshot.docs.map((doc) => {
        const data = doc.data();

        // Manually map each field to match the BuyingOrder type, including default values for missing fields
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

  useEffect(() => {
    fetchProducts();
    fetchBuyingOrders();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
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
            products={products}
            onOrderAdded={() => {
              setShowForm(false);
              fetchBuyingOrders(); // Refresh order list after adding a new order
            }}
          />
        )}

        {/* Display Buying Orders in a Table */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Eksisterende Ordrer</h2>
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Ordre Nr</th>
                <th className="border border-gray-300 p-2">Leverandør</th>
                <th className="border border-gray-300 p-2">Style</th>
                <th className="border border-gray-300 p-2">Farve</th>
                <th className="border border-gray-300 p-2">Købt Antal</th>
                <th className="border border-gray-300 p-2">ETA Dato</th>
                <th className="border border-gray-300 p-2">Leveringsuge</th>
                <th className="border border-gray-300 p-2">Sæson</th>
              </tr>
            </thead>
            <tbody>
              {buyingOrders.map((order) => (
                <tr key={order.id}>
                  <td className="border border-gray-300 p-2">{order.ordreNr}</td>
                  <td className="border border-gray-300 p-2">{order.leverandor}</td>
                  <td className="border border-gray-300 p-2">{order.style}</td>
                  <td className="border border-gray-300 p-2">{order.farve}</td>
                  <td className="border border-gray-300 p-2">{order.koebtAntal}</td>
                  <td className="border border-gray-300 p-2">{order.etaDato.toDateString()}</td>
                  <td className="border border-gray-300 p-2">{order.leveringsuge}</td>
                  <td className="border border-gray-300 p-2">{order.saeson}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BuyingOrders;
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface Order {
  id?: string;
  orderPlacedDate: string;
  orderNumber: string;
  styleName: string;
  styleColor: string;
  pcs: number;
  deliveryWeek: string;
  confirmed: boolean;
  supplier: string;
}

const OrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const currentYear = new Date().getFullYear(); // Get the current year

  const [newOrder, setNewOrder] = useState<Order>({
    orderPlacedDate: `${currentYear}-01-01`, // Set the initial date with the current year
    orderNumber: '',
    styleName: '',
    styleColor: '',
    pcs: 0,
    deliveryWeek: '',
    confirmed: false,
    supplier: '',
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const ordersCollection = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersCollection);
    const ordersList = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
    setOrders(ordersList);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setNewOrder(prevOrder => ({
        ...prevOrder,
        [name]: target.checked,
      }));
    } else {
      setNewOrder(prevOrder => ({
        ...prevOrder,
        [name]: value,
      }));
    }
  };

  const handleAddOrder = async () => {
    try {
      const ordersCollection = collection(db, 'orders');
      const docRef = await addDoc(ordersCollection, newOrder);
      setOrders([...orders, { ...newOrder, id: docRef.id }]);
    } catch (error) {
      console.error('Error adding document: ', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
      setOrders(orders.filter(order => order.id !== id));
    } catch (error) {
      console.error('Error deleting document: ', error);
    }
  };


  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Orders</h1>

      {/* Add Order Form */}
      <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Add New Order</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleAddOrder(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Order Placed Date:</label>
            <input
              type="date"
              name="orderPlacedDate"
              value={newOrder.orderPlacedDate}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Order Number:</label>
            <input
              type="text"
              name="orderNumber"
              value={newOrder.orderNumber}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Style Name:</label>
            <input
              type="text"
              name="styleName"
              value={newOrder.styleName}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Style Color:</label>
            <input
              type="text"
              name="styleColor"
              value={newOrder.styleColor}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pcs:</label>
            <input
              type="number"
              name="pcs"
              value={newOrder.pcs}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Delivery Week:</label>
            <input
              type="text"
              name="deliveryWeek"
              value={newOrder.deliveryWeek}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirmed:</label>
            <input
              type="checkbox"
              name="confirmed"
              checked={newOrder.confirmed}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier:</label>
            <input
              type="text"
              name="supplier"
              value={newOrder.supplier}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div className="flex space-x-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add Order
          </button>
          <button
            type="button"
            onClick={() => setNewOrder({
              orderPlacedDate: newOrder.orderPlacedDate, // Keep the current year in the date
              orderNumber: '',
              styleName: '',
              styleColor: '',
              pcs: 0,
              deliveryWeek: '',
              confirmed: false,
              supplier: '',
            })}
            className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
          >
            Reset
          </button>
        </div>
        </form>
      </div>

      {/* Orders Table */}
      {orders.length > 0 && (
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b-2 border-gray-200">Order Placed Date</th>
              <th className="px-4 py-2 border-b-2 border-gray-200">Order Number</th>
              <th className="px-4 py-2 border-b-2 border-gray-200">Style Name</th>
              <th className="px-4 py-2 border-b-2 border-gray-200">Style Color</th>
              <th className="px-4 py-2 border-b-2 border-gray-200">Pcs</th>
              <th className="px-4 py-2 border-b-2 border-gray-200">Delivery Week</th>
              <th className="px-4 py-2 border-b-2 border-gray-200">Confirmed</th>
              <th className="px-4 py-2 border-b-2 border-gray-200">Supplier</th>
              <th className="px-4 py-2 border-b-2 border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={index} className="hover:bg-gray-100">
                <td className="px-4 py-2 border-b border-gray-200">{order.orderPlacedDate}</td>
                <td className="px-4 py-2 border-b border-gray-200">{order.orderNumber}</td>
                <td className="px-4 py-2 border-b border-gray-200">{order.styleName}</td>
                <td className="px-4 py-2 border-b border-gray-200">{order.styleColor}</td>
                <td className="px-4 py-2 border-b border-gray-200">{order.pcs}</td>
                <td className="px-4 py-2 border-b border-gray-200">{order.deliveryWeek}</td>
                <td className="px-4 py-2 border-b border-gray-200">{order.confirmed ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 border-b border-gray-200">{order.supplier}</td>
                <td className="px-4 py-2 border-b border-gray-200">
                  <button
                    onClick={() => handleDelete(order.id!)}
                    className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrdersTable;
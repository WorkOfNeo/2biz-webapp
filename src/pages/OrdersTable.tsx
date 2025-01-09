import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

export interface Order {
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

export interface Article {
  id?: string;
  itemNumber: string;
  size: string;
  color: string;
  brand: string;
  productName: string;
  category: string;
  costPrice: string;
  recRetail: string;
  ean: string;
  stock: string;
  sku: string;
  quality: string;
  season: string;
  sold: string;
  inPurchase: string;
}

export interface Product {
  id?: string;
  itemNumber: string;
  items: Article[];
  totalStock: number;
  category: string;
  deliveryInfo?: {
    color: string;
    deliveryWeek: string;
  }[];
  orders?: string[];
}

const OrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allocation, setAllocation] = useState<{ [key: string]: { [key: string]: number } }>({});
  const currentYear = new Date().getFullYear();

  const [newOrder, setNewOrder] = useState<Order>({
    orderPlacedDate: `${currentYear}-01-01`,
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
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    const ordersCollection = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersCollection);
    const ordersList = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];
    setOrders(ordersList);
  };

  const fetchProducts = async () => {
    const productsCollection = collection(db, 'products');
    const productsSnapshot = await getDocs(productsCollection);
    const productsList = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
    setProducts(productsList);
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

  const handleAllocationChange = (productId: string, color: string, size: string, value: number) => {
    setAllocation(prevAllocations => ({
      ...prevAllocations,
      [productId]: {
        ...prevAllocations[productId],
        [`${color}-${size}`]: value,
      },
    }));
  };

  const handleAddOrder = async () => {
    try {
      let totalPcs = 0;
      const selectedProduct = products.find(product => product.itemNumber === newOrder.styleName);
      if (!selectedProduct) return;

      // Calculate the total pieces allocated
      for (const item of selectedProduct.items) {
        const allocationKey = `${item.color}-${item.size}`;
        if (allocation[selectedProduct.id!] && allocation[selectedProduct.id!][allocationKey]) {
          totalPcs += allocation[selectedProduct.id!][allocationKey];
        }
      }

      if (totalPcs > 0) {
        // Add the order to the orders collection
        const ordersCollection = collection(db, 'orders');
        const orderRef = await addDoc(ordersCollection, { ...newOrder, pcs: totalPcs });

        // Update the inPurchase field in the articles in the products collection
        await Promise.all(
          selectedProduct.items.map(async (item) => {
            const allocationKey = `${item.color}-${item.size}`;
            if (allocation[selectedProduct.id!] && allocation[selectedProduct.id!][allocationKey]) {
              const newInPurchase = parseInt(item.inPurchase) + allocation[selectedProduct.id!][allocationKey];
              await setDoc(doc(db, 'articles', item.id!), { inPurchase: newInPurchase.toString() }, { merge: true });
            }
          })
        );

        // Update the product in the products collection
        await setDoc(doc(db, 'products', selectedProduct.id!), {
          ...selectedProduct,
          orders: selectedProduct.orders ? [...selectedProduct.orders, orderRef.id] : [orderRef.id],
        });

        setOrders([...orders, { ...newOrder, id: orderRef.id, pcs: totalPcs }]);
      }
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
    <div className="max-w-8xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">Orders</h1>

      {/* Add Order Form */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-medium mb-3">Allocate Products and Create New Order</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddOrder();
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-600">Order Placed Date:</label>
            <input
              type="date"
              name="orderPlacedDate"
              value={newOrder.orderPlacedDate}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Order Number:</label>
            <input
              type="text"
              name="orderNumber"
              value={newOrder.orderNumber}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Style Name:</label>
            <input
              type="text"
              name="styleName"
              value={newOrder.styleName}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Supplier:</label>
            <input
              type="text"
              name="supplier"
              value={newOrder.supplier}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600">Select Product:</label>
            <select
              name="styleName"
              value={newOrder.styleName}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a product</option>
              {products.map(product => (
                <option key={product.id} value={product.itemNumber}>
                  {product.itemNumber} - {product.items[0].productName}
                </option>
              ))}
            </select>
          </div>
          {newOrder.styleName && (
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-600">Allocate inPurchase:</h3>
              {products
                .filter(product => product.itemNumber === newOrder.styleName)
                .map(product => (
                  <div key={product.id}>
                    {product.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center mb-2">
                        <div>
                          {item.color} - {item.size}: Available {item.stock}
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={allocation[product.id!] && allocation[product.id!][`${item.color}-${item.size}`] || 0}
                          onChange={(e) => {
                            const value = Math.max(0, parseInt(e.target.value) || 0);
                            handleAllocationChange(product.id!, item.color, item.size, value);
                          }}
                          className="w-16 p-1 border border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
          <div className="flex space-x-2 col-span-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Add Order
            </button>
            <button
              type="button"
              onClick={() =>
                setNewOrder({
                  orderPlacedDate: newOrder.orderPlacedDate,
                  orderNumber: '',
                  styleName: '',
                  styleColor: '',
                  pcs: 0,
                  deliveryWeek: '',
                  confirmed: false,
                  supplier: '',
                })
              }
              className="px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Orders Table */}
      {orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Order Placed Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Order Number</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Style Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Style Color</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Pcs</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Delivery Week</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Confirmed</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-700">{order.orderPlacedDate}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.orderNumber}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.styleName}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.styleColor}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.pcs}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.deliveryWeek}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.confirmed ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.supplier}</td>
                  <td className="px-4 py-2 text-sm">
                    <button
                      onClick={() => handleDelete(order.id!)}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;
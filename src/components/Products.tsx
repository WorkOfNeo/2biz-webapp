import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard'; // Import the ProductCard component
import { Product, Order, ConsolidatedItem } from './types'; // Import interfaces

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [consolidatedItemsMap, setConsolidatedItemsMap] = useState<{
    [key: string]: { [color: string]: ConsolidatedItem };
  }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('AKTIV');

  useEffect(() => {
    // Reset products when selectedStatus or searchTerm changes
    setProducts([]);
    setConsolidatedItemsMap({});
    fetchProductsAndOrders();
  }, [selectedStatus, searchTerm]);

  const fetchProductsAndOrders = async () => {
    try {
      const ordersCollection = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersCollection);
      const ordersList = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      const productsCollection = collection(db, 'products');
      let productsQuery;

      if (searchTerm) {
        // Fetch all products and filter client-side
        const productsSnapshot = await getDocs(productsCollection);
        let productsList = productsSnapshot.docs.map((doc) => {
          const data = doc.data();
          const sizesArray = data.sizes
            ? data.sizes.split(',').map((size: string) => size.trim())
            : [];
          return {
            id: doc.id,
            ...data,
            sizesArray,
          } as Product;
        });

        // Filter by searchTerm, selectedStatus, and isActive
        productsList = productsList.filter((product) => {
          const matchesSearch = product.productName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase());
          const matchesStatus = product.varestatus === selectedStatus;
          const isActive = product.isActive !== false; // Exclude inactive products
          return matchesSearch && matchesStatus && isActive;
        });

        if (productsList.length === 0) {
          setProducts([]);
          setConsolidatedItemsMap({});
          return;
        }

        processProducts(productsList, ordersList);
      } else {
        // Fetch all products matching the selectedStatus and isActive
        productsQuery = query(
          productsCollection,
          where('varestatus', '==', selectedStatus),
          where('isActive', '==', true)
        );

        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map((doc) => {
          const data = doc.data();
          const sizesArray = data.sizes
            ? data.sizes.split(',').map((size: string) => size.trim())
            : [];
          return {
            id: doc.id,
            ...data,
            sizesArray,
          } as Product;
        });

        if (productsList.length === 0) {
          setProducts([]);
          setConsolidatedItemsMap({});
          return;
        }

        processProducts(productsList, ordersList);
      }
    } catch (error) {
      console.error('Error fetching products and orders:', error);
    }
  };

  const processProducts = (productsList: Product[], ordersList: Order[]) => {
    const newConsolidatedItemsMap: { [key: string]: { [color: string]: ConsolidatedItem } } = {};
    const newProducts: Product[] = [];

    productsList.forEach((product) => {
      newProducts.push(product);
      const consolidatedItems = product.items.reduce(
        (acc: { [color: string]: ConsolidatedItem }, item) => {
          if (!acc[item.color]) {
            acc[item.color] = {
              sizes: product.sizesArray,
              stock: {},
              sold: {},
              inPurchase: {},
              disponibel: {},
              deliveryWeek: item.leveringsuge || 'Unknown',
              leverandor: item.leverandor || 'Unknown',
              salgspris: item.salgspris || 'Unknown',
              vejledendeUdsalgspris: item.vejledendeUdsalgspris || 'Unknown',
            };
          }

          const size = item.size;
          const stock = parseInt(item.stock) || 0;
          const sold = -(parseInt(item.sold) || 0);
          const inPurchase = parseInt(item.inPurchase) || 0;
          const disponibel = stock + sold + inPurchase;

          acc[item.color].stock[size] = stock;
          acc[item.color].sold[size] = sold;
          acc[item.color].inPurchase[size] = inPurchase;
          acc[item.color].disponibel[size] = disponibel;

          const relatedOrder = ordersList.find(
            (order) =>
              order.styleName === item.productName && order.styleColor === item.color
          );
          if (relatedOrder) {
            acc[item.color].deliveryWeek = relatedOrder.deliveryWeek;
          }

          return acc;
        },
        {}
      );

      newConsolidatedItemsMap[product.id!] = consolidatedItems;
    });

    setProducts(newProducts);
    setConsolidatedItemsMap(newConsolidatedItemsMap);
  };

  const sumRow = (data: { [key: string]: number }) => {
    return Object.values(data).reduce((sum, value) => sum + value, 0);
  };

  const handleToggleStatus = (status: string) => {
    setSelectedStatus(status);
  };

  // Function to handle deleting a product
  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        // Delete the product document from Firestore
        await deleteDoc(doc(db, 'products', productId));

        // Remove the product from the local state
        setProducts((prevProducts) =>
          prevProducts.filter((product) => product.id !== productId)
        );

        // Remove the product from the consolidated items map
        setConsolidatedItemsMap((prevMap) => {
          const newMap = { ...prevMap };
          delete newMap[productId];
          return newMap;
        });

        alert('Product deleted successfully.');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('An error occurred while deleting the product.');
      }
    }
  };

  // Function to check if a product has any colors with stock
  const productHasStock = (productId: string) => {
    const colors = consolidatedItemsMap[productId] || {};
    return Object.values(colors).some(
      (details) => sumRow(details.stock) > 0
    );
  };

  return (
    <div className="container mx-auto p-4">
      {/* Top Section with Toggles and Search Bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Toggle Buttons */}
        <div className="flex space-x-2">
          {['AKTIV', 'PASSIV', 'NOS'].map((status) => (
            <button
              key={status}
              onClick={() => handleToggleStatus(status)}
              className={`px-4 py-2 rounded ${
                selectedStatus === status ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="SEARCH A STYLE"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg py-2 px-4 w-1/3"
        />
      </div>

      {/* Product List */}
      {products.length > 0 ? (
        products
          .filter((product) => productHasStock(product.id!))
          .map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              consolidatedItems={consolidatedItemsMap[product.id!] || {}}
              handleDeleteProduct={handleDeleteProduct}
            />
          ))
      ) : (
        <p>No products found matching your search criteria.</p>
      )}
    </div>
  );
};

export default Products;
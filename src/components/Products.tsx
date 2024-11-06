// src/components/Products.tsx

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
import ProductCard from './ProductCard'; // Ensure the path is correct
import { Product, Order, ConsolidatedItem, Article } from './types'; // Corrected import path

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
    fetchProductsAndArticles();
  }, [selectedStatus, searchTerm]);

  const fetchProductsAndArticles = async () => {
    try {
      // Fetch Orders
      const ordersCollection = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersCollection);
      const ordersList = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      // Fetch Products
      const productsCollection = collection(db, 'products');
      let productsQuery;

      if (searchTerm) {
        // Fetch all products and filter client-side
        const productsSnapshot = await getDocs(productsCollection);
        let productsList = productsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
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

        // Directly attach the embedded articles
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
          return {
            id: doc.id,
            ...data,
          } as Product;
        });

        if (productsList.length === 0) {
          setProducts([]);
          setConsolidatedItemsMap({});
          return;
        }

        // Directly attach the embedded articles
        processProducts(productsList, ordersList);
      }
    } catch (error) {
      console.error('Error fetching products and articles:', error);
    }
  };

  const processProducts = (productsList: Product[], ordersList: Order[]) => {
    const newConsolidatedItemsMap: { [key: string]: { [color: string]: ConsolidatedItem } } = {};
    const newProducts: Product[] = [];

    productsList.forEach((product) => {
      newProducts.push(product);
      const consolidatedItems = product.items.reduce(
        (acc: { [color: string]: ConsolidatedItem }, article: Article) => {
          if (!acc[article.color]) {
            acc[article.color] = {
              sizes: product.sizesArray,
              stock: {},
              sold: {},
              inPurchase: {},
              disponibel: {},
              deliveryWeek: article.leveringsuge || 'Unknown',
              leverandor: article.leverandor || 'Unknown',
              salgspris: article.salgspris || 'Unknown',
              vejledendeUdsalgspris: article.vejledendeUdsalgspris || 'Unknown',
            };
          }

          const size = article.size;
          const stock = parseInt(article.stock) || 0;
          const sold = -(parseInt(article.sold) || 0);
          const inPurchase = parseInt(article.inPurchase) || 0;
          const disponibel = stock + sold + inPurchase;

          acc[article.color].stock[size] = stock;
          acc[article.color].sold[size] = sold;
          acc[article.color].inPurchase[size] = inPurchase;
          acc[article.color].disponibel[size] = disponibel;

          const relatedOrder = ordersList.find(
            (order) =>
              order.styleName === article.productName && order.styleColor === article.color
          );
          if (relatedOrder) {
            acc[article.color].deliveryWeek = relatedOrder.deliveryWeek;
          }

          return acc;
        },
        {}
      );

      newConsolidatedItemsMap[product.id] = consolidatedItems;
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

        alert('Product and its articles deleted successfully.');
      } catch (error) {
        console.error('Error deleting product and articles:', error);
        alert('An error occurred while deleting the product and its articles.');
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
          .filter((product) => productHasStock(product.id))
          .map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              consolidatedItems={consolidatedItemsMap[product.id] || {}}
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
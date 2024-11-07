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
import ProductCard from './ProductCard';
import { Product, Order, ConsolidatedItem, Article } from './types';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [consolidatedItemsMap, setConsolidatedItemsMap] = useState<{
    [key: string]: { [color: string]: ConsolidatedItem };
  }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('AKTIV');
  const [expandAll, setExpandAll] = useState<boolean>(false);

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

        // Sort productsList alphabetically by productName
        productsList.sort((a, b) => a.productName.localeCompare(b.productName));

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

        // Sort productsList alphabetically by productName
        productsList.sort((a, b) => a.productName.localeCompare(b.productName));

        // Directly attach the embedded articles
        processProducts(productsList, ordersList);
      }
    } catch (error) {
      console.error('Error fetching products and articles:', error);
    }
  };

  const processProducts = (productsList: Product[], ordersList: Order[]) => {
    const newConsolidatedItemsMap: {
      [key: string]: { [color: string]: ConsolidatedItem };
    } = {};
    const newProducts: Product[] = [];

    productsList.forEach((product) => {
      newProducts.push(product);

      const consolidatedItems = product.items.reduce(
        (acc: { [color: string]: ConsolidatedItem }, article: Article) => {
          const color = article.color;

          // Initialize the color if it doesn't exist
          if (!acc[color]) {
            acc[color] = {
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

          acc[color].stock[size] = stock;
          acc[color].sold[size] = sold;
          acc[color].inPurchase[size] = inPurchase;
          acc[color].disponibel[size] = disponibel;

          const relatedOrder = ordersList.find(
            (order) =>
              order.styleName === article.productName &&
              order.styleColor === article.color
          );
          if (relatedOrder) {
            acc[color].deliveryWeek = relatedOrder.deliveryWeek;
          }

          return acc;
        },
        {}
      );

      // Sort colors alphabetically
      const sortedConsolidatedItems = Object.keys(consolidatedItems)
        .sort((a, b) => a.localeCompare(b))
        .reduce(
          (obj: { [color: string]: ConsolidatedItem }, key) => {
            obj[key] = consolidatedItems[key];
            return obj;
          },
          {}
        );

      newConsolidatedItemsMap[product.id] = sortedConsolidatedItems;
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
    return Object.values(colors).some((details) => sumRow(details.stock) > 0);
  };

  return (
    <div className="container-l mx-auto p-2 w-full">
      {/* Top Section with Toggles, Search Bar, and Expand All Button */}
      <div className="flex items-center justify-between mb-4">
        {/* Toggle Buttons */}
        <div className="flex space-x-2 w-full">
          {['AKTIV', 'PASSIV', 'NOS'].map((status) => (
            <button
              key={status}
              onClick={() => handleToggleStatus(status)}
              className={`px-4 py-2 w-1/3 ${
                selectedStatus === status ? 'bg-black text-white' : 'bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar and Expand All Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="search-bar-container w-full flex">
          <input
            type="text"
            placeholder="SØG EFTER STYLE"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-black py-2 px-4 flex-1"
          />
        </div>
        <button
          onClick={() => setExpandAll(!expandAll)}
          className="ml-4 w-1/5 bg-black text-white px-4 py-2 h-full border-1-black"
        >
          {expandAll ? 'Skjul lager' : 'Vis lager'}
        </button>
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
              expandAll={expandAll}
            />
          ))
      ) : (
        <p>Der er ingen produkter der matcher din søgning. Prøv evt at slet din nuværende søgning, og skriv igen. Husk, du søger kun i den liste der er valgt.</p>
      )}
    </div>
  );
};

export default Products;
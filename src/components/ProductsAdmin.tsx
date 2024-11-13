// src/components/ProductsAdmin.tsx

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

// Define the props interface (optional)
interface ProductsAdminProps {
  // Add any props if needed in the future
}

const ProductsAdmin: React.FC<ProductsAdminProps> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [consolidatedItemsMap, setConsolidatedItemsMap] = useState<{
    [key: string]: { [color: string]: ConsolidatedItem };
  }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('AKTIV');
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [showSoldOnly, setShowSoldOnly] = useState<boolean>(false); // New state for filter toggle
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset products when selectedStatus, searchTerm, or showSoldOnly changes
    setProducts([]);
    setConsolidatedItemsMap({});
    fetchProductsAndArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, searchTerm, showSoldOnly]);

  const fetchProductsAndArticles = async () => {
    setLoading(true);
    setError(null);
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

        // Filter by searchTerm, selectedStatus, isActive
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
          setLoading(false);
          return;
        }

        // Sort productsList alphabetically by productName
        productsList.sort((a, b) => a.productName.localeCompare(b.productName));

        // Process Products and Orders
        const newConsolidatedItemsMap = processProducts(productsList, ordersList);

        // Apply Admin Filter based on showSoldOnly
        const filtered = applyAdminFilter(productsList, newConsolidatedItemsMap, showSoldOnly);

        setProducts(filtered.filteredProducts);
        setConsolidatedItemsMap(filtered.filteredConsolidatedItemsMap);
      } else {
        // Build Firestore query with selectedStatus and isActive
        const constraints: any[] = [
          where('varestatus', '==', selectedStatus),
          where('isActive', '==', true),
        ];

        productsQuery = query(productsCollection, ...constraints);

        const productsSnapshot = await getDocs(productsQuery);
        let productsList = productsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          } as Product;
        });

        if (productsList.length === 0) {
          setProducts([]);
          setConsolidatedItemsMap({});
          setLoading(false);
          return;
        }

        // Sort productsList alphabetically by productName
        productsList.sort((a, b) => a.productName.localeCompare(b.productName));

        // Process Products and Orders
        const newConsolidatedItemsMap = processProducts(productsList, ordersList);

        // Apply Admin Filter based on showSoldOnly
        const filtered = applyAdminFilter(productsList, newConsolidatedItemsMap, showSoldOnly);

        setProducts(filtered.filteredProducts);
        setConsolidatedItemsMap(filtered.filteredConsolidatedItemsMap);
      }
    } catch (error: any) {
      console.error('Error fetching products and articles:', error);
      setError('Der opstod en fejl under indlæsning af produkter. Prøv igen senere.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Processes the fetched products and orders to build the consolidatedItemsMap.
   * @param productsList - Array of fetched products.
   * @param ordersList - Array of fetched orders.
   * @returns The new consolidatedItemsMap.
   */
  const processProducts = (
    productsList: Product[],
    ordersList: Order[]
  ): { [key: string]: { [color: string]: ConsolidatedItem } } => {
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
          const sold = -(parseInt(article.sold) || 0); // Keep sold as negative
          const inPurchase = parseInt(article.inPurchase) || 0;
          const disponibel = stock + sold + inPurchase;

          acc[color].stock[size] = stock;
          acc[color].sold[size] = sold; // Negative value
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

    // Update consolidatedItemsMap state
    setConsolidatedItemsMap(newConsolidatedItemsMap);
    return newConsolidatedItemsMap;
  };

  /**
   * Applies the adminFilter to include only products with at least one sold article if showSoldOnly is true.
   * Otherwise, include all products.
   * @param productsList - Array of fetched products.
   * @param newConsolidatedItemsMap - The consolidated items map built by processProducts.
   * @param showSoldOnly - Boolean indicating whether to apply the sold articles filter.
   * @returns An object containing filteredProducts and filteredConsolidatedItemsMap.
   */
  const applyAdminFilter = (
    productsList: Product[],
    newConsolidatedItemsMap: { [key: string]: { [color: string]: ConsolidatedItem } },
    showSoldOnly: boolean
  ): { filteredProducts: Product[]; filteredConsolidatedItemsMap: { [key: string]: { [color: string]: ConsolidatedItem } } } => {
    if (!showSoldOnly) {
      // If the filter toggle is off, return all products
      return {
        filteredProducts: productsList,
        filteredConsolidatedItemsMap: newConsolidatedItemsMap,
      };
    }

    const filteredProducts: Product[] = [];
    const filteredConsolidatedItemsMap: {
      [key: string]: { [color: string]: ConsolidatedItem };
    } = {};

    productsList.forEach((product) => {
      const consolidatedItems = newConsolidatedItemsMap[product.id];
      if (consolidatedItems) {
        // Check if any sold count is less than zero
        const hasSold = Object.values(consolidatedItems).some((item) =>
          Object.values(item.sold).some((soldCount) => soldCount < 0)
        );

        console.log(`Product ID: ${product.id}, Has Sold Articles: ${hasSold}`); // Debugging

        if (hasSold) {
          filteredProducts.push(product);
          filteredConsolidatedItemsMap[product.id] = consolidatedItems;
        }
      }
    });

    return {
      filteredProducts,
      filteredConsolidatedItemsMap,
    };
  };

  /**
   * Calculates the sum of values in a given row.
   * @param data - An object with numeric values.
   * @returns The sum of all values.
   */
  const sumRow = (data: { [key: string]: number }) => {
    return Object.values(data).reduce((sum, value) => sum + value, 0);
  };

  /**
   * Handles the toggling of product statuses.
   * @param status - The status to toggle to.
   */
  const handleToggleStatus = (status: string) => {
    setSelectedStatus(status);
  };

  /**
   * Handles the deletion of a product.
   * @param productId - The ID of the product to delete.
   */
  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Er du sikker på, at du vil slette dette produkt?')) {
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

        alert('Produktet og dets artikler blev slettet med succes.');
      } catch (error: any) {
        console.error('Fejl ved sletning af produkt og artikler:', error);
        alert('Der opstod en fejl under sletning af produktet og dets artikler.');
      }
    }
  };

  /**
   * Checks if a product has any colors with stock.
   * @param productId - The ID of the product to check.
   * @returns True if the product has stock, otherwise false.
   */
  const productHasStock = (productId: string) => {
    const colors = consolidatedItemsMap[productId] || {};
    return Object.values(colors).some((details) => sumRow(details.stock) > 0);
  };

  return (
    <div className="container-l mx-auto p-2 w-full">
      {/* Top Section with Toggles, Search Bar, Expand All Button, and Sold Articles Filter */}
      <div className="flex flex-col md:flex-col gap-2 items-center justify-between mb-4 space-y-4 md:space-y-0 flex-wrap">
        {/* Toggle Buttons */}
        <div className="flex space-x-2 w-full md:w-auto">
          {['AKTIV', 'PASSIV', 'NOS'].map((status) => (
            <button
              key={status}
              onClick={() => handleToggleStatus(status)}
              className={`px-4 py-2 w-1/3 md:w-auto ${
                selectedStatus === status ? 'bg-black text-white' : 'bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="search-bar-container w-full md:w-1/3 flex">
          <input
            type="text"
            placeholder="SØG EFTER STYLE"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-black py-2 px-4 flex-1"
          />
        </div>

        {/* Sold Articles Filter Toggle */}
        <div className="sold-filter w-full md:w-auto flex items-center space-x-2">
          <label htmlFor="soldFilter" className="font-medium">
            Vis kun produkter med solgte artikler:
          </label>
          <input
            type="checkbox"
            id="soldFilter"
            checked={showSoldOnly}
            onChange={(e) => setShowSoldOnly(e.target.checked)}
            className="h-4 w-4"
          />
        </div>

        {/* Expand All Button */}
        <button
          onClick={() => setExpandAll(!expandAll)}
          className="w-full md:w-1/5 bg-black text-white px-4 py-2 h-full border-1-black"
        >
          {expandAll ? 'Skjul lager' : 'Vis lager'}
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && <p className="text-center">Indlæser produkter...</p>}

      {/* Error Message */}
      {error && <p className="text-center text-red-500">{error}</p>}

      {/* Product List */}
      {!loading && !error && (
        <>
          {products.length > 0 ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                consolidatedItems={consolidatedItemsMap[product.id] || {}}
                handleDeleteProduct={handleDeleteProduct}
                expandAll={expandAll}
              />
            ))
          ) : (
            <p className="text-center">
              Der er ingen produkter der matcher din søgning. Prøv evt at slette din nuværende
              søgning og skriv igen. Husk, du søger kun i den liste der er valgt.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ProductsAdmin;
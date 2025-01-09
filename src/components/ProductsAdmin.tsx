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
import { Product, Order, ConsolidatedItem, Article } from './types';
import AdminProductCard from './AdminProductCard';

interface ProductsAdminProps {}

const ProductsAdmin: React.FC<ProductsAdminProps> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [consolidatedItemsMap, setConsolidatedItemsMap] = useState<{
    [key: string]: { [color: string]: ConsolidatedItem };
  }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('AKTIV');
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [showSoldOnly, setShowSoldOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProducts([]);
    setConsolidatedItemsMap({});
    fetchProductsAndArticles();
  }, [selectedStatus, searchTerm, showSoldOnly]);

  const fetchProductsAndArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const ordersCollection = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersCollection);
      const ordersList = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      const productsCollection = collection(db, 'products');
      let productsList: Product[] = [];

      if (searchTerm) {
        const productsSnapshot = await getDocs(productsCollection);
        productsList = productsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          } as Product;
        });

        productsList = productsList.filter((product) => {
          const matchesSearch = product.productName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase());
          const matchesStatus = product.varestatus === selectedStatus;
          const isActive = product.isActive !== false;
          return matchesSearch && matchesStatus && isActive;
        });

        if (productsList.length === 0) {
          setProducts([]);
          setConsolidatedItemsMap({});
          setLoading(false);
          return;
        }

        productsList.sort((a, b) => a.productName.localeCompare(b.productName));
      } else {
        const constraints: any[] = [
          where('varestatus', '==', selectedStatus),
          where('isActive', '==', true),
        ];
        const productsQuery = query(productsCollection, ...constraints);
        const productsSnapshot = await getDocs(productsQuery);
        productsList = productsSnapshot.docs.map((doc) => {
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

        productsList.sort((a, b) => a.productName.localeCompare(b.productName));
      }

      const newConsolidatedItemsMap = processProducts(productsList, ordersList);
      const filtered = applyAdminFilter(productsList, newConsolidatedItemsMap, showSoldOnly);

      setProducts(filtered.filteredProducts);
      setConsolidatedItemsMap(filtered.filteredConsolidatedItemsMap);
    } catch (error: any) {
      console.error('Error fetching products and articles:', error);
      setError('Der opstod en fejl under indlæsning af produkter. Prøv igen senere.');
    } finally {
      setLoading(false);
    }
  };

  const processProducts = (
    productsList: Product[],
    ordersList: Order[]
  ): { [key: string]: { [color: string]: ConsolidatedItem } } => {
    const newConsolidatedItemsMap: {
      [key: string]: { [color: string]: ConsolidatedItem };
    } = {};

    productsList.forEach((product) => {
      const consolidatedItems = product.items.reduce(
        (acc: { [color: string]: ConsolidatedItem }, article: Article) => {
          const color = article.color;
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

      const sortedConsolidatedItems = Object.keys(consolidatedItems)
        .sort((a, b) => a.localeCompare(b))
        .reduce((obj: { [color: string]: ConsolidatedItem }, key) => {
          obj[key] = consolidatedItems[key];
          return obj;
        }, {});

      newConsolidatedItemsMap[product.id] = sortedConsolidatedItems;
    });

    return newConsolidatedItemsMap;
  };

  const applyAdminFilter = (
    productsList: Product[],
    newConsolidatedItemsMap: { [key: string]: { [color: string]: ConsolidatedItem } },
    showSoldOnly: boolean
  ): {
    filteredProducts: Product[];
    filteredConsolidatedItemsMap: { [key: string]: { [color: string]: ConsolidatedItem } };
  } => {
    if (!showSoldOnly) {
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
        const hasSold = Object.values(consolidatedItems).some((item) =>
          Object.values(item.sold).some((soldCount) => soldCount < 0)
        );

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

  const sumRow = (data: { [key: string]: number }) => {
    return Object.values(data).reduce((sum, value) => sum + value, 0);
  };

  const handleToggleStatus = (status: string) => {
    setSelectedStatus(status);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Er du sikker på, at du vil slette dette produkt?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        setProducts((prevProducts) =>
          prevProducts.filter((product) => product.id !== productId)
        );
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

  return (
    <div className="container-l mx-auto p-2 w-full">
      <div className="flex flex-col md:flex-col gap-2 items-center justify-between mb-4 space-y-4 md:space-y-0 flex-wrap">
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

        <div className="search-bar-container w-full md:w-1/3 flex">
          <input
            type="text"
            placeholder="SØG EFTER STYLE"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-black py-2 px-4 flex-1"
          />
        </div>

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

        <button
          onClick={() => setExpandAll(!expandAll)}
          className="w-full md:w-1/5 bg-black text-white px-4 py-2 h-full border-1-black"
        >
          {expandAll ? 'Skjul lager' : 'Vis lager'}
        </button>
      </div>

      {loading && <p className="text-center">Indlæser produkter...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && !error && (
        <>
          {products.length > 0 ? (
            products.map((product) => (
              <AdminProductCard
                key={product.id}
                product={product}
                consolidatedItems={consolidatedItemsMap[product.id] || {}}
                handleDeleteProduct={handleDeleteProduct}
                expandAll={expandAll}
              />
            ))
          ) : (
            <p className="text-center">
              Der er ingen produkter der matcher din søgning.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ProductsAdmin;
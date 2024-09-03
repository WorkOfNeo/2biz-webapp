import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

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
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const productsCollection = collection(db, 'products');
    const productsSnapshot = await getDocs(productsCollection);
    const productsList = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      itemNumber: doc.data().itemNumber,
      items: doc.data().items || [], // Ensure 'items' is always an array
      totalStock: doc.data().items.reduce((total: number, item: Article) => total + parseInt(item.stock), 0),
      category: doc.data().category,
    })) as Product[];

    console.log('Fetched Products:', productsList); // Debugging: Check fetched data
    setProducts(productsList);
  };

  const deleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        setProducts(products.filter(product => product.id !== productId));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const getSizeHeaders = (category: string) => {
    console.log('Category:', category); // Debugging: Check category value
    if (category === 'PANT') {
      return ['34', '36', '38', '40', '42', '44', '46', '48']; // Ensure these sizes match what you expect
    }
    // Add other categories and corresponding sizes here
    return [];
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <Link to="/articles" className="text-blue-500 hover:text-blue-700 mb-6 inline-block">
        Go to Articles
      </Link>
      {products.length > 0 && products.map((product) => (
        <div key={product.id} className="bg-white shadow-md rounded-lg mb-8 p-4">
          <button
            onClick={() => deleteProduct(product.id!)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete
          </button>
          <h2 className="text-xl font-semibold mb-4">Item Number: {product.itemNumber}</h2>
          <p className="mb-4 text-gray-700">Total Stock: {product.totalStock}</p>
          {Object.entries(
            product.items.reduce((acc: any, item: Article) => {
              if (!acc[item.color]) {
                acc[item.color] = {
                  stock: {},
                  sold: {},
                  inPurchase: {},
                  disponibel: {},
                };
              }
              const stock = parseInt(item.stock) || 0;
              const sold = -(parseInt(item.sold) || 0); // Sold as a negative value
              const inPurchase = parseInt(item.inPurchase) || 0;
              const disponibel = stock + sold + inPurchase;

              acc[item.color].stock[item.size] = stock;
              acc[item.color].sold[item.size] = sold;
              acc[item.color].inPurchase[item.size] = inPurchase;
              acc[item.color].disponibel[item.size] = disponibel;

              return acc;
            }, {})
          ).map(([color, details]: [string, any]) => (
            <div key={color} className="mb-8">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="py-2 px-4 border-b">Color: {color}</th>
                    {getSizeHeaders(product.category).map((size) => (
                      <th key={size} className="py-2 px-4 border-b">{size}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr key={`${color}-stock`} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b text-gray-700">Stock</td>
                    {getSizeHeaders(product.category).map((size) => (
                      <td key={size} className="py-2 px-4 border-b text-center">
                        {details.stock[size] !== undefined ? details.stock[size] : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr key={`${color}-sold`} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b text-gray-700">Sold</td>
                    {getSizeHeaders(product.category).map((size) => (
                      <td key={size} className="py-2 px-4 border-b text-center text-red-500">
                        {details.sold[size] !== undefined ? details.sold[size] : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr key={`${color}-inPurchase`} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b text-gray-700">In Purchase</td>
                    {getSizeHeaders(product.category).map((size) => (
                      <td key={size} className="py-2 px-4 border-b text-center">
                        {details.inPurchase[size] !== undefined ? details.inPurchase[size] : '-'}
                      </td>
                    ))}
                  </tr>
                  <tr key={`${color}-disponibel`} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b text-gray-700">Disponibel</td>
                    {getSizeHeaders(product.category).map((size) => (
                      <td key={size} className="py-2 px-4 border-b text-center font-semibold">
                        {details.disponibel[size] !== undefined ? details.disponibel[size] : '-'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Products;

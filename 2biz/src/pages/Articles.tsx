import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, addDoc, query, where } from 'firebase/firestore';
import CSVReader from 'react-csv-reader';
import { Product, Article } from '../components/Products'; // Adjust path and import interfaces
import Products from '../components/Products'; // Import the Products component

// Extend the Article interface to include Sold and In Purchase
export interface ExtendedArticle extends Article {
  sold: string;
  inPurchase: string;
}

const Articles: React.FC = () => {
  const [csvData, setCsvData] = useState<ExtendedArticle[]>([]);
  const [articles, setArticles] = useState<ExtendedArticle[]>([]);
  const [delimiter, setDelimiter] = useState<string>(',');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    const articlesCollection = collection(db, 'articles');
    const articlesSnapshot = await getDocs(articlesCollection);
    const articlesList = articlesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExtendedArticle[];
    setArticles(articlesList);
  };

  const handleDeleteAll = async () => {
    try {
      // Delete all articles
      const articlesCollection = collection(db, 'articles');
      const articlesSnapshot = await getDocs(articlesCollection);
      const articleDeletionPromises = articlesSnapshot.docs.map(doc => deleteDoc(doc.ref));
  
      // Delete all products
      const productsCollection = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCollection);
      const productDeletionPromises = productsSnapshot.docs.map(doc => deleteDoc(doc.ref));
  
      // Execute all deletions
      await Promise.all([...articleDeletionPromises, ...productDeletionPromises]);
  
      // Clear local state
      setArticles([]);
    } catch (error) {
      console.error('Error deleting all documents: ', error);
    }
  };

  const handleFileLoad = (data: any) => {
    const formattedData = data.map((row: any) => ({
      itemNumber: row[0],
      size: row[1],
      color: row[2],
      brand: row[3],
      productName: row[4],
      category: row[5],
      costPrice: row[6],
      recRetail: row[7],
      ean: row[8],
      stock: row[9],
      sku: row[10],
      quality: row[11],
      season: row[12],
      sold: row[13],          // Added for Sold
      inPurchase: row[14],    // Added for In Purchase
    }));
    setCsvData(formattedData);
  };

  const handleSubmit = async () => {
    try {
      const articlesCollection = collection(db, 'articles');
      const productsCollection = collection(db, 'products');

      const productMap: { [key: string]: Product } = {};

      const promises = csvData.map(async (article) => {
        if (article.itemNumber && article.productName) {
          const docRef = await addDoc(articlesCollection, article);

          // Group articles by itemNumber
          if (!productMap[article.itemNumber]) {
            productMap[article.itemNumber] = {
              itemNumber: article.itemNumber,
              items: [],
              totalStock: 0,
              category: article.category,  // Ensure category is included
            };
          }

          productMap[article.itemNumber].items.push({ ...article, id: docRef.id });
          productMap[article.itemNumber].totalStock += parseInt(article.stock);
        }
      });

      await Promise.all(promises);

      // Save grouped products to the products collection
      const productSavePromises = Object.values(productMap).map(async (product) => {
        const existingProductQuery = query(productsCollection, where('itemNumber', '==', product.itemNumber));
        const existingProductSnapshot = await getDocs(existingProductQuery);

        if (!existingProductSnapshot.empty) {
          // If the product exists, update it
          const productDoc = existingProductSnapshot.docs[0];
          await deleteDoc(productDoc.ref); // delete the old product
        }

        await addDoc(productsCollection, product);
      });

      await Promise.all(productSavePromises);

      fetchArticles(); // Refresh articles after submitting
    } catch (error) {
      console.error('Error saving documents: ', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'articles', id));
      setArticles(articles.filter(article => article.id !== id));
    } catch (error) {
      console.error('Error deleting document: ', error);
    }
  };

  return (
    <div>
      <h1>Articles</h1>

      {/* Delete All Button */}
      <button onClick={handleDeleteAll} style={{ marginBottom: '20px', color: 'red' }}>
        Delete All
      </button>
      
      {/* Dropdown for selecting the delimiter */}
      <label htmlFor="delimiter-select">Select CSV Delimiter:</label>
      <select
        id="delimiter-select"
        value={delimiter}
        onChange={(e) => setDelimiter(e.target.value)}
      >
        <option value=",">Comma (,)</option>
        <option value=";">Semicolon (;)</option>
        <option value="\t">Tab</option>
        <option value="|">Pipe (|)</option>
      </select>

      {/* CSV Upload */}
      <CSVReader
        cssClass="csv-reader-input"
        label="Upload CSV file"
        onFileLoaded={handleFileLoad}
        onError={() => console.log('Error')}
        inputId="csv-upload"
        inputStyle={{ color: 'red' }}
        parserOptions={{
          delimiter: delimiter,
        }}
      />

      {/* Submit Button */}
      <button onClick={handleSubmit}>Submit CSV</button>
      
      {/* Articles Table */}
      {articles.length > 0 && (
        <div>
          <h2>Articles</h2>
          <table>
            <thead>
              <tr>
                <th>Item Number</th>
                <th>Size</th>
                <th>Color</th>
                <th>Brand</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Cost Price</th>
                <th>Rec Retail</th>
                <th>EAN</th>
                <th>Stock</th>
                <th>SKU</th>
                <th>Quality</th>
                <th>Season</th>
                <th>Sold</th>          {/* New column for Sold */}
                <th>In Purchase</th>    {/* New column for In Purchase */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article, index) => (
                <tr key={index}>
                  <td>{article.itemNumber}</td>
                  <td>{article.size}</td>
                  <td>{article.color}</td>
                  <td>{article.brand}</td>
                  <td>{article.productName}</td>
                  <td>{article.category}</td>
                  <td>{article.costPrice}</td>
                  <td>{article.recRetail}</td>
                  <td>{article.ean}</td>
                  <td>{article.stock}</td>
                  <td>{article.sku}</td>
                  <td>{article.quality}</td>
                  <td>{article.season}</td>
                  <td>{article.sold}</td>          {/* Display Sold */}
                  <td>{article.inPurchase}</td>    {/* Display In Purchase */}
                  <td>
                    <button onClick={() => handleDelete(article.id!)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Use Products component instead of inline table */}
      <Products />
    </div>
  );
};

export default Articles;

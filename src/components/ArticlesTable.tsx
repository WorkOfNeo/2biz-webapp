import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const ArticlesTable: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    const articlesCollection = collection(db, 'articles');
    const articlesSnapshot = await getDocs(articlesCollection);
    const articlesList = articlesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setArticles(articlesList);
  };

  const handleDeleteAll = async () => {
    try {
      const articlesCollection = collection(db, 'articles');
      const articlesSnapshot = await getDocs(articlesCollection);
      const articleDeletionPromises = articlesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(articleDeletionPromises);
      setArticles([]); // Clear local state
    } catch (error) {
      console.error('Error deleting all documents: ', error);
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
      <button onClick={handleDeleteAll} style={{ marginBottom: '20px', color: 'red' }}>
        Delete All
      </button>
      {articles.length > 0 && (
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
              <th>Leveringsuge</th> {/* New column for delivery week */}
              <th>Leverandør</th> {/* New column for supplier */}
              <th>Salgspris</th> {/* New column for sales price */}
              <th>Vejledende udsalgspris</th> {/* New column for suggested retail price */}
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
                <td>{article.leveringsuge}</td> {/* Display delivery week */}
                <td>{article.leverandor}</td> {/* Display supplier */}
                <td>{article.salgspris}</td> {/* Display sales price */}
                <td>{article.vejledendeUdsalgspris}</td> {/* Display suggested retail price */}
                <td>
                  <button onClick={() => handleDelete(article.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ArticlesTable;
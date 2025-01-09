// components/ArticlesList.tsx

import React from 'react';

export interface ExtendedArticle {
  id?: string;
  itemNumber: string;
  size?: string;
  color?: string;
  brand?: string;
  productName: string;
  category?: string;
  costPrice?: string;
  recRetail?: string;
  ean?: string;
  stock?: string;
  sku?: string;
  quality?: string;
  season?: string;
  sold?: string;
  inPurchase?: string;
  leveringsuge?: string;
  leverandor?: string;
  salgspris?: string;
  vejledendeUdsalgspris?: string;
  varestatus?: string;
  inaktiv?: string;
  isActive?: boolean;
}

interface ArticlesListProps {
  articles: ExtendedArticle[];
}

const ArticlesList: React.FC<ArticlesListProps> = ({ articles }) => {
  if (articles.length === 0) {
    return <p className="text-center">No articles available.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <div
          key={article.id}
          className="border rounded-lg p-4 shadow-md hover:shadow-xl transition duration-200"
        >
          <h2 className="text-xl font-semibold mb-2">{article.productName}</h2>
          <p><strong>Item Number:</strong> {article.itemNumber}</p>
          {article.size && <p><strong>Size:</strong> {article.size}</p>}
          {article.color && <p><strong>Color:</strong> {article.color}</p>}
          {article.brand && <p><strong>Brand:</strong> {article.brand}</p>}
          {article.category && <p><strong>Category:</strong> {article.category}</p>}
          {article.costPrice && <p><strong>Cost Price:</strong> {article.costPrice}</p>}
          {article.recRetail && <p><strong>Recommended Retail:</strong> {article.recRetail}</p>}
          {article.ean && <p><strong>EAN:</strong> {article.ean}</p>}
          {article.stock && <p><strong>Stock:</strong> {article.stock}</p>}
          {article.sku && <p><strong>SKU:</strong> {article.sku}</p>}
          {article.quality && <p><strong>Quality:</strong> {article.quality}</p>}
          {article.season && <p><strong>Season:</strong> {article.season}</p>}
          {article.sold && <p><strong>Sold:</strong> {article.sold}</p>}
          {article.inPurchase && <p><strong>In Purchase:</strong> {article.inPurchase}</p>}
          {article.leveringsuge && <p><strong>Delivery Week:</strong> {article.leveringsuge}</p>}
          {article.leverandor && <p><strong>Supplier:</strong> {article.leverandor}</p>}
          {article.varestatus && <p><strong>Varestatus:</strong> {article.varestatus}</p>}
          {article.inaktiv !== undefined && (
            <p><strong>Inactive:</strong> {article.inaktiv ? 'Yes' : 'No'}</p>
          )}
          {article.isActive !== undefined && (
            <p><strong>Active:</strong> {article.isActive ? 'Yes' : 'No'}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ArticlesList;
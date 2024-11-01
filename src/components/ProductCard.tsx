// src/components/ProductCard.tsx
import React, { useState } from 'react';
import { Product, ConsolidatedItem } from './types'; // Import interfaces

interface ProductCardProps {
  product: Product;
  consolidatedItems: { [color: string]: ConsolidatedItem };
  handleDeleteProduct: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  consolidatedItems,
  handleDeleteProduct,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Size orders for different size types
  const alphaSizeOrder = ['XS', 'S', 'S/M', 'M', 'M/L', 'L', 'L/XL', 'XL', 'XXL'];
  const numericSizeOrder = ['34', '36', '38', '40', '42', '44', '46', '48'];

  const getSizeHeaders = (): string[] => {
    const sizes = [...product.sizesArray]; // Create a copy of sizes
    const sizeOrder = product.category === 'PANT' ? numericSizeOrder : alphaSizeOrder;

    // Sort sizes based on the specified order
    return sizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);

      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };

  const sumRow = (data: { [key: string]: number }) => Object.values(data).reduce((sum, value) => sum + value, 0);

  return (
    <div className="mb-4 pb-4 border-b border-black">
      {/* Product Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xl">
            <span className="font-bold mr-2">{product.productName}</span>
            <span>{product.category}</span>
          </h2>
          <span>{isExpanded ? '▲' : '▼'}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteProduct(product.id!);
          }}
          className="text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>

      {/* Expanded Product Details */}
      {isExpanded && (
        <div className="bg-white mt-2">
          {Object.entries(consolidatedItems).map(([color, details]) => {
            const totalStock = sumRow(details.stock);
            if (totalStock <= 0) return null; // Skip colors with zero total stock

            return (
              <div key={color} className="mb-4">
                <h3 className="font-semibold">FARVE: {color}</h3>
                <table className="w-full border-collapse mt-2">
                  <thead>
                    <tr>
                      <th className="text-left px-2 py-1">Type</th>
                      <th className="text-left px-2 py-1">SUM</th>
                      {getSizeHeaders().map((size) => (
                        <th key={size} className="px-2 py-1 text-left">{size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['På lager', 'Solgte', 'Købsordre', 'Disponibel'].map((label, index) => {
                      const dataKey = ['stock', 'sold', 'inPurchase', 'disponibel'][index];
                      const rowData = details[dataKey];

                      return (
                        <tr key={label}>
                          <td className="px-2 py-1">{label}</td>
                          <td className="px-2 py-1">{sumRow(rowData)}</td>
                          {getSizeHeaders().map((size) => (
                            <td key={size} className="px-2 py-1">
                              {rowData[size] !== undefined ? rowData[size] : '-'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
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

  // Define size orders for different size types
  const alphaSizeOrder = ['XS', 'S', 'S/M', 'M', 'M/L', 'L', 'L/XL', 'XL', 'XXL'];
  const numericSizeOrder = ['34', '36', '38', '40', '42', '44', '46', '48'];

  const getSizeHeaders = (product: Product): string[] => {
    const sizes = [...product.sizesArray]; // Create a copy to avoid mutating state

    let sizeOrder: string[] = [];

    // Determine which size order to use based on the category or available sizes
    if (product.category === 'PANT') {
      sizeOrder = numericSizeOrder;
    } else {
      sizeOrder = alphaSizeOrder;
    }

    // Sort sizes based on the sizeOrder array
    sizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) {
        // Both sizes not found in sizeOrder, sort alphabetically
        return a.localeCompare(b);
      } else if (indexA === -1) {
        // Size a is not found, place it after size b
        return 1;
      } else if (indexB === -1) {
        // Size b is not found, place it after size a
        return -1;
      } else {
        // Both sizes found, sort based on their index in sizeOrder
        return indexA - indexB;
      }
    });

    return sizes;
  };

  const sumRow = (data: { [key: string]: number }) => {
    return Object.values(data).reduce((sum, value) => sum + value, 0);
  };

  return (
    <div className="mb-4 pb-4 border-b border-black ">
      {/* Product Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
              <div className="flex items-center gap-2">
                  <h2 className="text-xl">
                      <span className="font-bold mr-2">{product.productName}</span>
                      <span className="font-regular">{product.category && `${product.category}`}</span>
                  </h2>
                  <span>{isExpanded ? '▲' : '▼'}</span>
              </div>
        <div className="flex items-center space-x-2">
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the expand/collapse
              handleDeleteProduct(product.id!);
            }}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Expanded Product Details */}
      {isExpanded && (
        <div className="bg-white">
          {Object.entries(consolidatedItems || {}).map(
            ([color, details]: [string, ConsolidatedItem]) => {
              const totalStock = sumRow(details.stock);
              if (totalStock > 0) {
                return (
                  <div key={color} className="mb-4">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="float-left">FARVE: {color}</th>
                          <th className="">SUM</th>
                          {getSizeHeaders(product).map((size) => (
                            <th key={size} className="px-2 py-1">
                              {size}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* På lager (In Stock) */}
                        <tr>
                          <td className="px-2 py-1">På lager</td>
                          <td className="px-2 py-1">
                            {sumRow(details.stock)}
                          </td>
                          {getSizeHeaders(product).map((size) => (
                            <td key={size} className="px-2 py-1">
                              {details.stock[size] !== undefined
                                ? details.stock[size]
                                : '-'}
                            </td>
                          ))}
                        </tr>
                        {/* Solgte (Sold) */}
                        <tr>
                          <td className="px-2 py-1">Solgte</td>
                          <td className="px-2 py-1">
                            {sumRow(details.sold)}
                          </td>
                          {getSizeHeaders(product).map((size) => (
                            <td key={size} className="px-2 py-1">
                              {details.sold[size] !== undefined
                                ? details.sold[size]
                                : '-'}
                            </td>
                          ))}
                        </tr>
                        {/* Købsordre (Purchase Orders) */}
                        <tr>
                          <td className="px-2 py-1">Købsordre</td>
                          <td className="px-2 py-1">
                            {sumRow(details.inPurchase)}
                          </td>
                          {getSizeHeaders(product).map((size) => (
                            <td key={size} className="px-2 py-1">
                              {details.inPurchase[size] !== undefined
                                ? details.inPurchase[size]
                                : '-'}
                            </td>
                          ))}
                        </tr>
                        {/* Disponibel (Available) */}
                        <tr>
                          <td className="px-2 py-1">Disponibel</td>
                          <td className="px-2 py-1">
                            {sumRow(details.disponibel)}
                          </td>
                          {getSizeHeaders(product).map((size) => (
                            <td key={size} className="px-2 py-1">
                              {details.disponibel[size] !== undefined
                                ? details.disponibel[size]
                                : '-'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              } else {
                // Do not render colors with total stock zero
                return null;
              }
            }
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
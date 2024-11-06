// src/components/ProductCard.tsx

import React, { useState } from 'react';
import { Product, ConsolidatedItem } from './types'; // Corrected import path

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
  // Debugging: Log sizesArray
  console.log(`Product ID: ${product.id}, sizesArray:`, product.sizesArray);

  // State to manage accordion expansion
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Size orders for different size types
  const alphaSizeOrder = ['XS', 'S', 'S/M', 'M', 'M/L', 'L', 'L/XL', 'XL', 'XXL'];
  const numericSizeOrder = ['34', '36', '38', '40', '42', '44', '46', '48'];

  const getSizeHeaders = (): string[] => {
    const sizes = Array.isArray(product.sizesArray) ? product.sizesArray : [];
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

  const sumRow = (data: { [key: string]: number }) =>
    Object.values(data).reduce((sum, value) => sum + value, 0);

  // Extract unique leverandors from consolidatedItems
  const leverandors = Array.from(
    new Set(
      Object.values(consolidatedItems)
        .map((details) => details.leverandor)
        .filter((leverandor) => leverandor !== 'Unknown') // Exclude unknown leverandors
    )
  );

  console.log(`Leverandors for Product ID ${product.id}:`, leverandors);

  const sizeHeaders = getSizeHeaders();

  return (
    <div className="biz_product-card mt-6">
      {/* Product Header */}
      <div
        onClick={() => {
          setIsExpanded(!isExpanded);
          console.log(`Product ID ${product.id} expanded state:`, !isExpanded);
        }}
        className="biz_product-header flex items-center justify-between pb-4 cursor-pointer"
      >
        <div className="biz_product-title flex items-center gap-2">
          <h2 className="biz_product-name text-xl">
            <span className="biz_product-name-bold font-bold mr-2">
              {product.productName}
            </span>
            <span className="biz_product-category">{product.category}</span>

            {/* Insert toggle angle icon here */}
            <div className="biz_toggle-icon ml-2">
              {isExpanded ? (
                // Angle Up Icon
                <svg
                  className="w-6 h-6 biz_header-icon transform transition-transform duration-300"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                // Angle Down Icon
                <svg
                  className="w-6 h-6 biz_header-icon transform transition-transform duration-300"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </h2>
        </div>
        {/* Replace button with the leverandor */}
        <div className="biz_leverandor-info text-sm text-gray-600">
          Leverandor: {leverandors.length > 0 ? leverandors.join(', ') : 'N/A'}
        </div>
      </div>

      {/* Product Details */}
      <div
        className={`biz_product-details overflow-hidden transition-max-height duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
      >
        {Object.entries(consolidatedItems).map(([color, details]) => {
          const totalStock = sumRow(details.stock);
          console.log(`Color: ${color}, Total Stock: ${totalStock}`);
          if (totalStock <= 0) {
            console.log(`Skipping color ${color} due to zero stock.`);
            return null; // Skip colors with zero total stock
          }

          // Extract unique delivery weeks for this color without using Set
          const deliveryWeeks = Array.isArray(details.leveringsuge)
            ? details.leveringsuge
            : details.leveringsuge
            ? [details.leveringsuge]
            : [];

          console.log(`Color: ${color}, Delivery Weeks Before Filtering:`, deliveryWeeks);

          // Filter unique weeks and exclude 'Unknown'
          const uniqueWeeks = deliveryWeeks.filter(
            (week, index, self) => week !== 'Unknown' && self.indexOf(week) === index
          );

          console.log(`Color: ${color}, Unique Delivery Weeks:`, uniqueWeeks);

          return (
            <div key={color} className="biz_color-section mt-2">
              <div className="biz_table-header-outer pb-2 mb-2">
                <h3 className="biz_color-title">FARVE: <span>{color}</span></h3>

                {/* Header Row */}
                <div className="biz_table-header2 flex">
                  <div className="biz_table-cell type w-1/4">Type</div>
                  <div className="biz_table-cell sum w-1/4">SUM</div>
                  {sizeHeaders.map((size) => (
                    <div key={size} className="biz_table-cell size-cell w-1/4">
                      {size}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Rows */}
              {['På lager', 'Solgte', 'Købsordre', 'Disponibel'].map((label, index) => {
                const dataKey = ['stock', 'sold', 'inPurchase', 'disponibel'][index];
                const rowData = details[dataKey];

                console.log(`Color: ${color}, Label: ${label}, Data Key: ${dataKey}, Row Data:`, rowData);

                return (
                  <div key={label} className="biz_table-row mt-2 flex">
                    <div className="biz_table-cell biz_type w-1/4">{label}</div>
                    <div className="biz_table-table-values flex w-3/4">
                      <div className="biz_table-cell type"></div>
                      <div className="biz_table-cell sum w-1/4">
                        {sumRow(rowData)}
                        {label === 'Købsordre' && uniqueWeeks.length > 0 && (
                          <div className="biz_delivery-weeks text-sm text-gray-500">
                            Leveringsuge: {uniqueWeeks.join(', ')}
                          </div>
                        )}
                      </div>
                      {sizeHeaders.map((size) => (
                        <div key={size} className="biz_table-cell size-cell biz_size w-1/4">
                          {rowData[size] !== undefined ? rowData[size] : '-'}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductCard;
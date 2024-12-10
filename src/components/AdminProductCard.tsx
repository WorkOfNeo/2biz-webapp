import React, { useState, useEffect } from 'react';
import { Product, ConsolidatedItem } from './types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminProductCardProps {
  product: Product;
  consolidatedItems: { [color: string]: ConsolidatedItem };
  handleDeleteProduct: (productId: string) => void;
  expandAll: boolean;
}

const AdminProductCard: React.FC<AdminProductCardProps> = ({
  product,
  consolidatedItems,
  handleDeleteProduct,
  expandAll,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isUde, setIsUde] = useState<boolean>(!!product.isUde);

  useEffect(() => {
    setIsExpanded(expandAll);
  }, [expandAll]);

  const alphaSizeOrder = [
    'XXS',
    'XS',
    'S',
    'S/M',
    'M',
    'M/L',
    'L',
    'L/XL',
    'XL',
    'XXL',
    'XXXL',
    'ONE SIZE',
  ];
  const numericSizeOrder = [
    '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34',
    '36', '38', '40', '42', '44', '46', '48',
  ];

  const getSizeHeaders = (): string[] => {
    const sizes = Array.isArray(product.sizesArray) ? product.sizesArray : [];
    const sizesWithNormalized = sizes.map((size) => {
      const normalizedSize = size.replace(/\s+/g, '').toUpperCase();
      return { original: size, normalized: normalizedSize };
    });

    const sizeOrderCombined = [...alphaSizeOrder, ...numericSizeOrder];
    const sizeOrderCombinedNormalized = sizeOrderCombined.map((size) =>
      size.replace(/\s+/g, '').toUpperCase()
    );

    const uniqueSizes = Array.from(
      new Set(sizesWithNormalized.map((item) => item.normalized))
    );

    uniqueSizes.sort((a, b) => {
      const indexA = sizeOrderCombinedNormalized.indexOf(a);
      const indexB = sizeOrderCombinedNormalized.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    const sortedSizes = uniqueSizes.map((normalizedSize) => {
      const originalItem = sizesWithNormalized.find(
        (item) => item.normalized === normalizedSize
      );
      return originalItem ? originalItem.original : normalizedSize;
    });

    return sortedSizes;
  };

  const sumRow = (data: { [key: string]: number }) =>
    Object.values(data).reduce((sum, value) => sum + value, 0);

  const leverandors = Array.from(
    new Set(
      Object.values(consolidatedItems)
        .map((details) => details.leverandor)
        .filter((leverandor) => leverandor !== 'Unknown')
    )
  );

  const sizeHeaders = getSizeHeaders();
  const getCurrentWeekNumber = (): number => {
    const currentDate = new Date();
    const oneJan = new Date(currentDate.getFullYear(), 0, 1);
    const numberOfDays = Math.floor(
      (currentDate.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000)
    );
    return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  };
  const getWeekDifference = (currentWeek: number, targetWeek: number): number => {
    let diff = currentWeek - targetWeek;
    if (diff < 0) {
      diff += 52;
    }
    return diff;
  };

  const currentWeekNumber = getCurrentWeekNumber();
  const leveringsugerSet = new Set<number>();
  product.items.forEach((article) => {
    if (article.leveringsuge && article.leveringsuge !== 'Unknown') {
      const match = article.leveringsuge.match(/\d+/);
      if (match) {
        const weekNumber = parseInt(match[0], 10);
        const weekDifference = getWeekDifference(currentWeekNumber, weekNumber);
        if (weekNumber > 0 && (weekNumber >= currentWeekNumber || weekDifference > 30)) {
          leveringsugerSet.add(weekNumber);
        }
      }
    }
  });
  const allLeveringsuger = Array.from(leveringsugerSet).sort((a, b) => a - b);

  const firstArticle = product.items[0];
  const recRetail = firstArticle?.recRetail || 'N/A';
  const costPrice = firstArticle?.costPrice || 'N/A';

  const handleToggleUde = async () => {
    const newUdeValue = !isUde;
    setIsUde(newUdeValue);
    await updateDoc(doc(db, 'products', product.id), { isUde: newUdeValue });
  };

  return (
    <div className={`biz_product-card mt-6 ${isUde ? 'product-is-out' : ''}`}>
      <div
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        className="biz_product-header flex items-center justify-between pb-4 cursor-pointer"
      >
        <div className="biz_product-title flex items-center gap-2">
          <h2 className="biz_product-name text-xl flex items-center">
            <span className="biz_product-name-bold font-bold mr-2">
              {product.productName}
            </span>
            <span className="biz_product-category">{product.category}</span>

            <div className="biz_toggle-icon ml-2">
              {isExpanded ? (
                <svg
                  className="w-6 h-6 biz_header-icon transform transition-transform"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 biz_header-icon transform transition-transform"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            <span className="biz_product-prices ml-4 flex flex-col">
              <span className="biz_cost-price mr-2 text-xs">
                Kostpris: <span className="font-bold">{costPrice} DKK</span>
              </span>
              <span className="biz_rec-retail text-xs">
                Vejl. udsalgspris: <span className="font-bold">{recRetail} DKK</span>
              </span>
            </span>

            {allLeveringsuger.length > 0 && (
              <div className="biz_leveringsuger ml-12 text-sm text-gray-600">
                <span className="font-bold">Leveringsuge:</span>{' '}
                {allLeveringsuger.map((week) => `${week}`).join(', ')}
              </div>
            )}
          </h2>
        </div>
        <div className="biz_leverandor-info text-sm text-gray-600">
          {leverandors.length > 0 ? leverandors.join(', ') : 'N/A'}
        </div>
      </div>

      <div
        className={`biz_product-details overflow-hidden ${
          isExpanded ? 'max-h-full' : 'max-h-0'
        } transition-all`}
      >
        {/* Toggle "Ude" Option */}
        <div className="mb-2 flex items-center">
          <label className="mr-2 text-sm font-medium" htmlFor="ude-toggle">
            Er ude?
          </label>
          <input
            id="ude-toggle"
            type="checkbox"
            checked={isUde}
            onChange={handleToggleUde}
            className="h-4 w-4 mr-auto"
          />

          {/* Replace "Slet produkt" with a left-aligned button */}
          <button
            className="bg-red-500 text-white py-1 px-3 rounded"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => handleDeleteProduct(product.id)}
          >
            Ude af sortiment
          </button>
        </div>

        {Object.entries(consolidatedItems).map(([color, details]) => {
          const totalStock = sumRow(details.stock);
          const totalSold = sumRow(details.sold);
          const totalInPurchase = sumRow(details.inPurchase);
          const totalDisponibel = sumRow(details.disponibel);

          if (
            totalStock === 0 &&
            totalSold === 0 &&
            totalInPurchase === 0 &&
            totalDisponibel === 0
          ) {
            return null;
          }

          return (
            <div key={color} className="biz_color-section mt-2">
              <div className="biz_table-header-outer pb-2 mb-2">
                <h3 className="biz_color-title font-bold">
                  FARVE: <span>{color}</span>
                </h3>

                <div className="biz_table-header2 flex">
                  <div className="biz_table-cell type w-1/4"></div>
                  <div className="biz_table-cell sum w-1/4">SUM</div>
                  {sizeHeaders.map((size) => (
                    <div key={size} className="biz_table-cell size-cell w-1/4">
                      {size}
                    </div>
                  ))}
                </div>
              </div>

              {[
                { label: 'På lager', dataKey: 'stock' },
                { label: 'Solgte', dataKey: 'sold' },
                { label: 'Købsordre', dataKey: 'inPurchase' },
                { label: 'Disponibel', dataKey: 'disponibel' },
              ].map(({ label, dataKey }) => {
                const rowData = details[dataKey];
                const totalRow = sumRow(rowData);
                if ((label === 'Solgte' || label === 'Købsordre') && totalRow === 0) {
                  return null;
                }

                return (
                  <div key={label} className="biz_table-row mt-2 flex">
                    <div className="biz_table-cell biz_type w-1/4 flex items-center">
                      {label}
                      {label === 'Købsordre' && allLeveringsuger.length > 0 && (
                        <div className="biz_week-numbers ml-2">
                          {allLeveringsuger.map((week) => (
                            <div key={week} className="biz_week">
                              <p>{week}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="biz_table-table-values flex w-3/4">
                      <div className="biz_table-cell type"></div>
                      <div className="biz_table-cell sum w-1/4">{totalRow}</div>
                      {sizeHeaders.map((size) => (
                        <div
                          key={size}
                          className="biz_table-cell size-cell biz_size w-1/4"
                        >
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

export default AdminProductCard;
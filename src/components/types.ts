// src/components/types.ts

/**
 * Represents an individual order.
 */
export interface Order {
  id?: string;
  styleName: string;
  styleColor: string;
  deliveryWeek: string;
}

/**
 * Represents an individual article/item within a product.
 */
export interface Article {
  id?: string;
  itemNumber: string;
  productName: string;
  size: string;
  color: string;
  brand: string;
  category: string;
  costPrice: string;
  recRetail: string;
  ean: string;
  stock: string; // Kept as string per user request
  sku: string;
  quality: string;
  season: string;
  sold: string; // Kept as string per user request
  inPurchase: string; // Kept as string per user request
  leveringsuge: string; // Delivery week
  leverandor: string;
  salgspris: string;
  vejledendeUdsalgspris: string;
  varestatus: string;
}

/**
 * Represents aggregated data for a specific delivery week within a color group.
 */
export interface DeliveryWeekData {
  leveringsuge: string;
  stock: { [size: string]: number };
  sold: { [size: string]: number };
  inPurchase: { [size: string]: number };
  disponibel: { [size: string]: number };
}

/**
 * Represents consolidated data for a specific color, including multiple delivery weeks.
 */
export interface ConsolidatedItem {
  sizes: string[];
  stock: { [size: string]: number };
  sold: { [size: string]: number };
  inPurchase: { [size: string]: number };
  disponibel: { [size: string]: number };
  deliveryWeek: string; // Existing field retained
  leverandor: string;
  salgspris: string;
  vejledendeUdsalgspris: string;
  
  /**
   * New field to handle multiple delivery weeks per color.
   * The key is the leveringsuge (delivery week number), and the value is the aggregated data for that week.
   */
  deliveryWeeks?: { [leveringsuge: string]: DeliveryWeekData };

  [key: string]: any; // Index signature retained
}

/**
 * Represents a product containing multiple articles/items.
 */
export interface Product {
  id: string; // Firestore document ID
  itemNumber: string;
  productName: string;
  category: string;
  sizesArray: string[]; // Array of size strings (e.g., ["S", "M", "L"])
  varestatus: string;
  isActive: boolean;
  totalStock: number;
  availableSizes: string; // Comma-separated sizes (e.g., "S, M, L")
  items: Article[]; // Array of individual articles/items
}

interface SalesRecord {
  productId: string;
  color: string;
  style: string;
  quantitySold: number;
  saleDate: string; // ISO date string
  // Add other fields if needed
}
// src/components/types.ts

/**
 * Represents an individual order.
 */
export interface Order {
  id?: string; // Optional ID, typically added by Firestore
  styleName: string;
  styleColor: string;
  deliveryWeek: string;
}

/**
 * Represents an individual article/item within a product.
 */
export interface Article {
  id?: string; // Optional ID, typically added by Firestore
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
  leveringsuge: string; // Delivery week number as string
  stock: { [size: string]: number };
  sold: { [size: string]: number };
  inPurchase: { [size: string]: number };
  disponibel: { [size: string]: number }; // Available stock per size
}

/**
 * Represents consolidated data for a specific color, including multiple delivery weeks.
 */
export interface ConsolidatedItem {
  sizes: string[]; // Array of sizes available
  stock: { [size: string]: number };
  sold: { [size: string]: number };
  inPurchase: { [size: string]: number };
  disponibel: { [size: string]: number };
  deliveryWeek: string; // Primary delivery week field for color grouping
  leverandor: string;
  salgspris: string;
  vejledendeUdsalgspris: string;

  /**
   * New field to handle multiple delivery weeks per color.
   * The key is the leveringsuge (delivery week number), and the value is the aggregated data for that week.
   */
  deliveryWeeks?: { [leveringsuge: string]: DeliveryWeekData }; // Optional mapping of weeks to data

  [key: string]: any; // Index signature for flexible additions
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
  varestatus: string; // Status of the product
  isActive: boolean; // Indicates if the product is active
  totalStock: number; // Total stock quantity
  availableSizes: string; // Comma-separated sizes (e.g., "S, M, L")
  items: Article[]; // Array of individual articles/items
}

/**
 * Represents a buying order.
 */
export interface BuyingOrder {
  id?: string;
  leverandor: string; // Supplier name
  ordreDato: Date; // Order date
  ordreNr: string; // Order number
  style: string; // Style of the item
  farve: string; // Color of the item
  koebtAntal: number; // Quantity bought
  etaDato: Date; // Estimated arrival date
  leveringsuge: number; // Delivery week as a number
  bekraeftet: boolean; // Confirmation status
  leveret: 'Ja' | 'Nej' | 'Delvist'; // Delivery status
  kommentarer: string[]; // Array of comments
  leveretAntal?: number; // Optional number of delivered items
  saeson: string; // Season
  productId: string; // Reference to the associated product
}
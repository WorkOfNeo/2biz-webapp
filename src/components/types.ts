// types.ts

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
    stock: string;
    sku: string;
    quality: string;
    season: string;
    sold: string;
    inPurchase: string;
    leveringsuge: string;
    leverandor: string;
    salgspris: string;
    vejledendeUdsalgspris: string;
    varestatus: string;
  }
  
  export interface Product {
    id?: string;
    itemNumber: string;
    items: Article[];
    totalStock: number;
    productName: string;
    category: string;
    leverandor: string;
    varestatus: string;
    sizes: string;
    sizesArray: string[];
    deliveryInfo?: {
      color: string;
      deliveryWeek: string;
    }[];
    orders?: string[];
    isActive?: boolean;
  }
  
  export interface Order {
    id?: string;
    styleName: string;
    styleColor: string;
    deliveryWeek: string;
  }
  
  export interface ConsolidatedItem {
    sizes: string[];
    stock: { [key: string]: number };
    sold: { [key: string]: number };
    inPurchase: { [key: string]: number };
    disponibel: { [key: string]: number };
    deliveryWeek: string;
    leverandor: string;
    salgspris: string;
    vejledendeUdsalgspris: string;
  }
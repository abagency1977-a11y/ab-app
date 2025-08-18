export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  transactionHistory: {
    totalSpent: number;
    lastPurchaseDate: string;
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  location?: string;
  price: number;
  historicalData?: { date: string; quantity: number }[];
}

export type OrderStatus = 'Pending' | 'Fulfilled' | 'Canceled';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
}

    
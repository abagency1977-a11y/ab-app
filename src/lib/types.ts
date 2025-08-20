
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
  // Added to support bulk payment dialog
  orders?: Order[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  gst: number;
  historicalData?: { date: string; quantity: number }[];
}

export type OrderStatus = 'Pending' | 'Fulfilled' | 'Canceled';
export type PaymentTerm = 'Full Payment' | 'Credit';
export type PaymentMode = 'Cash' | 'Card' | 'UPI' | 'Cheque' | 'Online Transfer';

export interface Payment {
  id: string;
  paymentDate: string;
  amount: number;
  method: PaymentMode;
  reference?: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  gst: number;
}

export interface Order {
  id:string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  discount: number;
  deliveryFees: number;
  grandTotal: number;
  paymentTerm: PaymentTerm;
  paymentMode?: PaymentMode;
  paymentRemarks?: string;
  dueDate?: string;
  deliveryDate?: string;
  deliveryAddress?: string;
  isGstInvoice: boolean;
  payments?: Payment[];
  balanceDue?: number;
}

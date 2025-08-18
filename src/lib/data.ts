import { Customer, Product, Order } from './types';

const customers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'Innovate Inc.',
    email: 'contact@innovate.com',
    phone: '555-0101',
    address: '123 Innovation Drive, Tech City, 12345',
    transactionHistory: { totalSpent: 15300, lastPurchaseDate: '2023-05-15' },
  },
  {
    id: 'CUST-002',
    name: 'Synergy Solutions',
    email: 'info@synergysolutions.com',
    phone: '555-0102',
    address: '456 Synergy Ave, Business Bay, 67890',
    transactionHistory: { totalSpent: 8250, lastPurchaseDate: '2023-05-20' },
  },
  {
    id: 'CUST-003',
    name: 'Quantum Creations',
    email: 'support@quantum.com',
    phone: '555-0103',
    address: '789 Quantum Blvd, Future Town, 54321',
    transactionHistory: { totalSpent: 22400, lastPurchaseDate: '2023-04-28' },
  },
    {
    id: 'CUST-004',
    name: 'Apex Enterprises',
    email: 'sales@apex.com',
    phone: '555-0104',
    address: '101 Apex Circle, Summit Peak, 13579',
    transactionHistory: { totalSpent: 5600, lastPurchaseDate: '2023-05-18' },
  },
  {
    id: 'CUST-005',
    name: 'Nexus Corp',
    email: 'admin@nexuscorp.com',
    phone: '555-0105',
    address: '210 Nexus Lane, Central Hub, 97531',
    transactionHistory: { totalSpent: 19800, lastPurchaseDate: '2023-05-22' },
  },
];

const products: Product[] = [
  {
    id: 'PROD-001',
    name: 'Premium Widget',
    sku: 'PW-1000',
    stock: 150,
    location: 'Warehouse A',
    price: 150.00,
    historicalData: [
        { date: '2023-01-15', quantity: 20 },
        { date: '2023-02-10', quantity: 25 },
        { date: '2023-03-12', quantity: 22 },
        { date: '2023-04-18', quantity: 30 },
        { date: '2023-05-20', quantity: 28 },
    ]
  },
  {
    id: 'PROD-002',
    name: 'Standard Gadget',
    sku: 'SG-2000',
    stock: 300,
    location: 'Warehouse B',
    price: 75.50,
     historicalData: [
        { date: '2023-01-20', quantity: 50 },
        { date: '2023-02-15', quantity: 45 },
        { date: '2023-03-20', quantity: 60 },
        { date: '2023-04-25', quantity: 55 },
        { date: '2023-05-28', quantity: 65 },
    ]
  },
  {
    id: 'PROD-003',
    name: 'Advanced Gizmo',
    sku: 'AG-3000',
    stock: 80,
    location: 'Warehouse A',
    price: 220.00,
     historicalData: [
        { date: '2023-01-05', quantity: 10 },
        { date: '2023-02-08', quantity: 12 },
        { date: '2023-03-10', quantity: 15 },
        { date: '2023-04-14', quantity: 11 },
        { date: '2023-05-19', quantity: 18 },
    ]
  },
  {
    id: 'PROD-004',
    name: 'Basic Thingamajig',
    sku: 'BT-4000',
    stock: 500,
    location: 'Warehouse C',
    price: 25.00,
     historicalData: [
        { date: '2023-01-25', quantity: 100 },
        { date: '2023-02-20', quantity: 120 },
        { date: '2023-03-28', quantity: 90 },
        { date: '2023-04-30', quantity: 110 },
        { date: '2023-05-30', quantity: 130 },
    ]
  },
];

const orders: Order[] = [
  {
    id: 'ORD-001',
    customerId: 'CUST-001',
    customerName: 'Innovate Inc.',
    orderDate: '2023-05-15',
    status: 'Fulfilled',
    items: [
      { productId: 'PROD-001', productName: 'Premium Widget', quantity: 20, price: 150.00 },
      { productId: 'PROD-002', productName: 'Standard Gadget', quantity: 50, price: 75.50 },
    ],
    total: 6775.00,
  },
  {
    id: 'ORD-002',
    customerId: 'CUST-002',
    customerName: 'Synergy Solutions',
    orderDate: '2023-05-20',
    status: 'Pending',
    items: [{ productId: 'PROD-003', productName: 'Advanced Gizmo', quantity: 10, price: 220.00 }],
    total: 2200.00,
  },
  {
    id: 'ORD-003',
    customerId: 'CUST-003',
    customerName: 'Quantum Creations',
    orderDate: '2023-04-28',
    status: 'Fulfilled',
    items: [
      { productId: 'PROD-001', productName: 'Premium Widget', quantity: 50, price: 150.00 },
      { productId: 'PROD-004', productName: 'Basic Thingamajig', quantity: 200, price: 25.00 },
    ],
    total: 12500.00,
  },
    {
    id: 'ORD-004',
    customerId: 'CUST-005',
    customerName: 'Nexus Corp',
    orderDate: '2023-05-22',
    status: 'Pending',
    items: [
      { productId: 'PROD-002', productName: 'Standard Gadget', quantity: 100, price: 75.50 },
      { productId: 'PROD-003', productName: 'Advanced Gizmo', quantity: 30, price: 220.00 },
    ],
    total: 14150.00,
  },
  {
    id: 'ORD-005',
    customerId: 'CUST-001',
    customerName: 'Innovate Inc.',
    orderDate: '2023-05-25',
    status: 'Canceled',
    items: [{ productId: 'PROD-004', productName: 'Basic Thingamajig', quantity: 100, price: 25.00 }],
    total: 2500.00,
  },
];


export const getCustomers = async (): Promise<Customer[]> => {
    return new Promise(resolve => setTimeout(() => resolve(customers), 500));
};

export const getProducts = async (): Promise<Product[]> => {
    return new Promise(resolve => setTimeout(() => resolve(products), 500));
};

export const getOrders = async (): Promise<Order[]> => {
    return new Promise(resolve => setTimeout(() => resolve(orders), 500));
};

export const getDashboardData = async () => {
    const totalRevenue = orders.filter(o => o.status === 'Fulfilled').reduce((sum, order) => sum + order.total, 0);
    const totalCustomers = customers.length;
    const itemsInStock = products.reduce((sum, product) => sum + product.stock, 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;

    const monthlyRevenue = orders.filter(o => o.status === 'Fulfilled').reduce((acc, order) => {
        const month = new Date(order.orderDate).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + order.total;
        return acc;
    }, {} as Record<string, number>);

    const revenueChartData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue: Math.round(revenue)}));

    return new Promise(resolve => setTimeout(() => resolve({
        totalRevenue,
        totalCustomers,
        itemsInStock,
        pendingOrders,
        revenueChartData,
        recentOrders: orders.slice(0, 5),
    }), 500));
};


import { db } from './firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, writeBatch, getDoc, query, limit, runTransaction, DocumentReference, updateDoc, increment } from 'firebase/firestore';
import type { Customer, Product, Order, Payment } from './types';

// MOCK DATA - This will be used to seed the database for the first time.
const mockCustomers: Omit<Customer, 'id'>[] = [
  {
    name: 'Innovate Inc.',
    email: 'contact@innovate.com',
    phone: '555-0101',
    address: '123 Innovation Drive, Tech City, 12345',
    transactionHistory: { totalSpent: 15300, lastPurchaseDate: '2023-05-15' },
  },
  {
    name: 'Synergy Solutions',
    email: 'info@synergysolutions.com',
    phone: '555-0102',
    address: '456 Synergy Ave, Business Bay, 67890',
    transactionHistory: { totalSpent: 8250, lastPurchaseDate: '2023-05-20' },
  },
  {
    name: 'Quantum Creations',
    email: 'support@quantum.com',
    phone: '555-0103',
    address: '789 Quantum Blvd, Future Town, 54321',
    transactionHistory: { totalSpent: 22400, lastPurchaseDate: '2023-04-28' },
  },
    {
    name: 'Apex Enterprises',
    email: 'sales@apex.com',
    phone: '555-0104',
    address: '101 Apex Circle, Summit Peak, 13579',
    transactionHistory: { totalSpent: 5600, lastPurchaseDate: '2023-05-18' },
  },
  {
    name: 'Nexus Corp',
    email: 'admin@nexuscorp.com',
    phone: '555-0105',
    address: '210 Nexus Lane, Central Hub, 97531',
    transactionHistory: { totalSpent: 19800, lastPurchaseDate: '2023-05-22' },
  },
];

const mockProducts: Omit<Product, 'id'>[] = [
  {
    name: 'Premium Widget',
    sku: 'PW-1000',
    stock: 150,
    price: 150.00,
    gst: 18,
    historicalData: [
        { date: '2023-01-15', quantity: 20 },
        { date: '2023-02-10', quantity: 25 },
        { date: '2023-03-12', quantity: 22 },
        { date: '2023-04-18', quantity: 30 },
        { date: '2023-05-20', quantity: 28 },
    ]
  },
  {
    name: 'Standard Gadget',
    sku: 'SG-2000',
    stock: 300,
    price: 75.50,
    gst: 18,
     historicalData: [
        { date: '2023-01-20', quantity: 50 },
        { date: '2023-02-15', quantity: 45 },
        { date: '2023-03-20', quantity: 60 },
        { date: '2023-04-25', quantity: 55 },
        { date: '2023-05-28', quantity: 65 },
    ]
  },
  {
    name: 'Advanced Gizmo',
    sku: 'AG-3000',
    stock: 80,
    price: 220.00,
    gst: 18,
     historicalData: [
        { date: '2023-01-05', quantity: 10 },
        { date: '2023-02-08', quantity: 12 },
        { date: '2023-03-10', quantity: 15 },
        { date: '2023-04-14', quantity: 11 },
        { date: '2023-05-19', quantity: 18 },
    ]
  },
  {
    name: 'Basic Thingamajig',
    sku: 'BT-4000',
    stock: 500,
    price: 25.00,
    gst: 18,
     historicalData: [
        { date: '2023-01-25', quantity: 100 },
        { date: '2023-02-20', quantity: 120 },
        { date: '2023-03-28', quantity: 90 },
        { date: '2023-04-30', quantity: 110 },
        { date: '2023-05-30', quantity: 130 },
    ]
  },
];

const mockOrders: Omit<Order, 'id'>[] = [
  {
    customerId: 'CUST-001',
    customerName: 'Innovate Inc.',
    orderDate: '2023-05-15',
    status: 'Fulfilled',
    items: [
      { productId: 'PROD-001', productName: 'Premium Widget', quantity: 20, price: 150.00, gst: 18 },
      { productId: 'PROD-002', productName: 'Standard Gadget', quantity: 50, price: 75.50, gst: 18 },
    ],
    total: 8000.00,
    discount: 225.00,
    deliveryFees: 0,
    grandTotal: 7775.00,
    paymentTerm: 'Full Payment',
    paymentMode: 'Card',
    isGstInvoice: true,
    deliveryAddress: '123 Innovation Drive, Tech City, 12345',
    deliveryDate: '2023-05-16',
    balanceDue: 0,
    payments: [
        { id: 'PAY-111', amount: 7775, method: 'Card', paymentDate: '2023-05-15'}
    ]
  },
  {
    customerId: 'CUST-002',
    customerName: 'Synergy Solutions',
    orderDate: '2023-05-20',
    status: 'Pending',
    items: [{ productId: 'PROD-003', productName: 'Advanced Gizmo', quantity: 10, price: 220.00, gst: 18 }],
    total: 2596,
    discount: 0,
    deliveryFees: 100,
    grandTotal: 2696,
    paymentTerm: 'Credit',
    dueDate: '2023-06-20',
    isGstInvoice: true,
    deliveryAddress: '456 Synergy Ave, Business Bay, 67890',
    payments: [
      { id: 'PAY-001', paymentDate: '2023-05-21', amount: 1000, method: 'Online Transfer' }
    ],
    balanceDue: 1696,
  },
  {
    customerId: 'CUST-003',
    customerName: 'Quantum Creations',
    orderDate: '2023-04-28',
    status: 'Fulfilled',
    items: [
      { productId: 'PROD-001', productName: 'Premium Widget', quantity: 50, price: 150.00, gst: 18 },
      { productId: 'PROD-004', productName: 'Basic Thingamajig', quantity: 200, price: 25.00, gst: 18 },
    ],
    total: 14750,
    discount: 500,
    deliveryFees: 0,
    grandTotal: 14250,
    paymentTerm: 'Full Payment',
    paymentMode: 'Online Transfer',
    isGstInvoice: true,
    deliveryDate: '2023-04-30',
    balanceDue: 0,
    payments: [
        { id: 'PAY-222', amount: 14250, method: 'Online Transfer', paymentDate: '2023-04-28'}
    ]
  },
    {
    customerId: 'CUST-005',
    customerName: 'Nexus Corp',
    orderDate: '2023-05-22',
    status: 'Pending',
    items: [
      { productId: 'PROD-002', productName: 'Standard Gadget', quantity: 100, price: 75.50, gst: 18 },
      { productId: 'PROD-003', productName: 'Advanced Gizmo', quantity: 30, price: 220.00, gst: 18 },
    ],
    total: 16699,
    discount: 0,
    deliveryFees: 250,
    grandTotal: 16949,
    paymentTerm: 'Credit',
    dueDate: '2023-06-22',
    isGstInvoice: false,
    deliveryDate: '2023-05-25',
    payments: [],
    balanceDue: 16949,
  },
  {
    customerId: 'CUST-001',
    customerName: 'Innovate Inc.',
    orderDate: '2023-05-25',
    status: 'Canceled',
    items: [{ productId: 'PROD-004', productName: 'Basic Thingamajig', quantity: 100, price: 25.00, gst: 18 }],
    total: 2950,
    discount: 0,
    deliveryFees: 0,
    grandTotal: 2950,
    paymentTerm: 'Full Payment',
    isGstInvoice: true,
  },
];


// Function to seed the database
async function seedCollection(collectionName: string, mockData: any[], idPrefix: string) {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(query(collectionRef, limit(1)));
    if (snapshot.empty) {
        console.log(`Seeding ${collectionName}...`);
        const batch = writeBatch(db);
        mockData.forEach((item, index) => {
            // To ensure mock orders can reference mock customers/products, we use predictable IDs during seeding
            const docId = `${idPrefix}-${String(index + 1).padStart(3, '0')}`;
            const docRef = doc(db, collectionName, docId);
            batch.set(docRef, item);
        });
        await batch.commit();
        console.log(`${collectionName} seeded.`);
    }
}

async function seedDatabase() {
    try {
        await seedCollection('customers', mockCustomers, 'CUST');
        await seedCollection('products', mockProducts, 'PROD');
        // Ensure that mock orders have correct customer and product IDs
        // This is a simple approach; a more robust solution would map old IDs to new IDs
        await seedCollection('orders', mockOrders, 'ORD');
    } catch (error) {
        console.error("Error seeding database: ", error);
    }
}

// Seed the database on startup if it's empty
// seedDatabase();


// CUSTOMER FUNCTIONS
export const getCustomers = async (): Promise<Customer[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'customers'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    } catch (error) {
        console.error("Error fetching customers: ", error);
        return [];
    }
};

export const addCustomer = async (customerData: Omit<Customer, 'id' | 'transactionHistory' | 'orders'>): Promise<Customer> => {
    const newCustomer: Omit<Customer, 'id'> = {
        ...customerData,
        transactionHistory: { totalSpent: 0, lastPurchaseDate: new Date().toISOString().split('T')[0] },
    };
    const docRef = await addDoc(collection(db, 'customers'), newCustomer);
    return { id: docRef.id, ...newCustomer, orders: [] };
};

export const deleteCustomer = async (id: string) => {
    await deleteDoc(doc(db, 'customers', id));
};


// PRODUCT FUNCTIONS
export const getProducts = async (): Promise<Product[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'products'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (error) {
        console.error("Error fetching products: ", error);
        return [];
    }
};

export const addProduct = async (productData: Omit<Product, 'id' | 'historicalData'>): Promise<Product> => {
     const newProduct = { ...productData, historicalData: [] };
    const docRef = await addDoc(collection(db, 'products'), newProduct);
    return { id: docRef.id, ...newProduct };
};

export const deleteProduct = async(id: string) => {
    await deleteDoc(doc(db, 'products', id));
};

// ORDER FUNCTIONS
export const getOrders = async (): Promise<Order[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'orders'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    } catch (error) {
        console.error("Error fetching orders: ", error);
        return [];
    }
};

async function getNextId(counterName: string, prefix: string): Promise<string> {
    const counterRef = doc(db, "counters", counterName);
    let nextNumber = 1;

    try {
        await runTransaction(db, async (transaction) => {
            const counterSnap = await transaction.get(counterRef);
            if (counterSnap.exists()) {
                nextNumber = counterSnap.data().currentNumber + 1;
                transaction.update(counterRef, { currentNumber: nextNumber });
            } else {
                // If the counter doesn't exist, create it.
                transaction.set(counterRef, { currentNumber: nextNumber });
            }
        });
    } catch (e) {
        console.error(`Transaction failed at ${counterName}: `, e);
        throw new Error(`Could not generate next ID for ${counterName}.`);
    }
    
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

export const addOrder = async (orderData: Omit<Order, 'id' | 'customerName'>): Promise<Order> => {
    const customerRef = doc(db, "customers", orderData.customerId);
    const customerSnap = await getDoc(customerRef);
     if (!customerSnap.exists()) {
        throw new Error("Customer not found");
    }
    const customerData = customerSnap.data();
    const customerName = customerData?.name;
    if (!customerName || typeof customerName !== 'string') {
        throw new Error(`Customer with ID ${orderData.customerId} has no name or name is invalid.`);
    }

    const orderId = await getNextId('orderCounter', 'ORD');
    let newOrderWithId: Order = { ...orderData, customerName, id: orderId };
    
    // Add new payment IDs if they exist
    if (newOrderWithId.payments) {
        let paymentCounter = 0;
        newOrderWithId.payments = newOrderWithId.payments.map(p => {
             paymentCounter++;
             return {...p, id: `${orderId}-PAY-${String(paymentCounter).padStart(2, '0')}`}
        });
    }
    
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Create the new order document
            transaction.set(doc(db, "orders", orderId), newOrderWithId);

            // 2. Update the customer's transaction history
            transaction.update(customerRef, {
                'transactionHistory.totalSpent': increment(newOrderWithId.grandTotal),
                'transactionHistory.lastPurchaseDate': newOrderWithId.orderDate
            });
        });

        // After successful transaction, return the new order data
        return newOrderWithId;
    } catch (e) {
        console.error("Add order transaction failed: ", e);
        if (e instanceof Error) {
           throw new Error(`Failed to save the new order. Details: ${e.message}`);
        }
        throw new Error("Failed to save the new order due to an unknown error.");
    }
};

export const updateOrder = async (orderData: Order): Promise<void> => {
    const { id, ...dataToUpdate } = orderData;
    if (!id) throw new Error("Order ID is required to update.");
    await setDoc(doc(db, 'orders', id), dataToUpdate, { merge: true });
};

export const addPaymentToOrder = async (orderId: string, payment: Omit<Payment, 'id'>): Promise<Order> => {
    const orderRef = doc(db, "orders", orderId);
    let updatedOrder: Order;

    try {
        await runTransaction(db, async (transaction) => {
            const orderSnap = await transaction.get(orderRef);
            if (!orderSnap.exists()) {
                throw new Error("Order not found!");
            }
            
            const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
            const existingPayments = order.payments || [];
            const paymentId = `${order.id}-PAY-${String(existingPayments.length + 1).padStart(2, '0')}`;
            const newPayment: Payment = { ...payment, id: paymentId };

            const newBalance = (order.balanceDue ?? order.grandTotal) - newPayment.amount;

            updatedOrder = {
                ...order,
                payments: [...existingPayments, newPayment],
                balanceDue: newBalance,
                status: newBalance <= 0 ? 'Fulfilled' : order.status
            };

            transaction.update(orderRef, {
                payments: updatedOrder.payments,
                balanceDue: updatedOrder.balanceDue,
                status: updatedOrder.status
            });
        });
        return updatedOrder!;
    } catch(e) {
        console.error("Payment transaction failed: ", e);
        throw e;
    }
};


// DASHBOARD DATA
export const getDashboardData = async () => {
    const orders = await getOrders();
    const customers = await getCustomers();
    const products = await getProducts();

    const totalRevenue = orders.filter(o => o.status === 'Fulfilled').reduce((sum, order) => sum + order.grandTotal, 0);
    const totalCustomers = customers.length;
    const itemsInStock = products.reduce((sum, product) => sum + product.stock, 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;

    const monthlyRevenue = orders.filter(o => o.status === 'Fulfilled').reduce((acc, order) => {
        const month = new Date(order.orderDate).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + order.grandTotal;
        return acc;
    }, {} as Record<string, number>);

    const revenueChartData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue: Math.round(revenue)}));

    return {
        totalRevenue,
        totalCustomers,
        itemsInStock,
        pendingOrders,
        revenueChartData,
        recentOrders: orders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5).map(o => ({...o, total: o.grandTotal})),
    };
};

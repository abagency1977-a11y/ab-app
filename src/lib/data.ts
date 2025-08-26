

import { db } from './firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, writeBatch, getDoc, query, limit, runTransaction, DocumentReference, updateDoc, increment, where, orderBy, Transaction } from 'firebase/firestore';
import type { Customer, Product, Order, Payment, OrderItem, PaymentAlert, LowStockAlert, Supplier, Purchase, PurchasePayment, OrderStatus, PaymentMode } from './types';
import { differenceInDays, addDays, startOfToday, subMonths } from 'date-fns';

// MOCK DATA - This will be used to seed the database for the first time.
const mockCustomers: Omit<Customer, 'id'>[] = [];

const mockProducts: Omit<Product, 'id'>[] = [
  {
    name: 'Premium Widget',
    sku: 'PW-1000',
    stock: 150,
    price: 150.00,
    cost: 75.00,
    gst: 18,
    reorderPoint: 20,
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
    cost: 30.00,
    gst: 18,
    reorderPoint: 50,
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
    cost: 110.00,
    gst: 18,
    reorderPoint: 15,
     historicalData: [
        { date: '2023-01-05', quantity: 10 },
        { date: '2023-02-08', quantity: 12 },
        { date: '2023-03-10', quantity: 15 },
        { date: '2023-04-14', quantity: 11 },
        { date: '2023-05-19', quantity: 18 },
    ]
  },
    {
    name: 'Outstanding Balance',
    sku: 'OB-0001',
    stock: 0,
    price: 1.00,
    cost: 0.00,
    gst: 0,
    reorderPoint: 0,
    historicalData: []
    }
];

const mockOrders: Omit<Order, 'id'>[] = [];
const mockSuppliers: Omit<Supplier, 'id'>[] = [];
const mockPurchases: Omit<Purchase, 'id'>[] = [];

// GET ALL DATA
export async function getAllData() {
    const customersPromise = getCustomers();
    const ordersPromise = getDocs(collection(db, 'orders')).then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    const productsPromise = getProducts();
    const suppliersPromise = getSuppliers();
    const purchasesPromise = getPurchases();

    const [customers, orders, products, suppliers, purchases] = await Promise.all([
        customersPromise,
        ordersPromise,
        productsPromise,
        suppliersPromise,
        purchasesPromise
    ]);
    
    return { customers, orders, products, suppliers, purchases };
}


// Function to seed the database
async function seedCollection(collectionName: string, mockData: any[], idPrefix: string) {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(query(collectionRef, limit(1)));
    if (snapshot.empty) {
        console.log(`Seeding ${collectionName}...`);
        const batch = writeBatch(db);
        mockData.forEach((item, index) => {
            const docId = `${idPrefix}-${String(index + 1).padStart(3, '0')}`;
            const docRef = doc(db, collectionName, docId);
            batch.set(docRef, item);
        });
        await batch.commit();
        console.log(`${collectionName} seeded.`);
    }
}

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

export const getCustomerById = async (id: string): Promise<Customer | null> => {
    try {
        const docRef = doc(db, 'customers', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Customer;
        }
        return null;
    } catch (error) {
        console.error("Error fetching customer by ID: ", error);
        return null;
    }
}

export const getCustomerBalance = async (customerId: string): Promise<number> => {
    if (!customerId) return 0;
    try {
        const ordersQuery = query(
            collection(db, 'orders'),
            where('customerId', '==', customerId)
        );
        const snapshot = await getDocs(ordersQuery);
        
        if (snapshot.empty) {
            return 0;
        }

        let customerOrders = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Order));
        
        customerOrders.sort((a, b) => {
            const dateA = new Date(a.orderDate).getTime();
            const dateB = new Date(b.orderDate).getTime();
            if (dateA !== dateB) return dateA - dateB;
            // Fallback sort by ID to ensure consistent order for same-day orders
            return (a.id || '').localeCompare(b.id || '');
        });
        
        if (customerOrders.length === 0) return 0;

        const mostRecentOrder = customerOrders[customerOrders.length - 1];
        return mostRecentOrder.balanceDue ?? 0;

    } catch (error) {
        console.error(`Error fetching balance for customer ${customerId}:`, error);
        return 0;
    }
}


export const addCustomer = async (customerData: Omit<Customer, 'id' | 'transactionHistory' | 'orders'>): Promise<Customer> => {
    const newCustomer: Omit<Customer, 'id'> = {
        ...customerData,
        transactionHistory: { totalSpent: 0, lastPurchaseDate: new Date().toISOString().split('T')[0] },
    };
    const docRef = await addDoc(collection(db, 'customers'), newCustomer);
    return { id: docRef.id, ...newCustomer, orders: [] };
};

export const updateCustomer = async (customerData: Customer): Promise<void> => {
    const { id, ...dataToUpdate } = customerData;
    if (!id) throw new Error("Customer ID is required to update.");
    await setDoc(doc(db, 'customers', id), dataToUpdate, { merge: true });
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

export const updateProduct = async (productData: Product): Promise<void> => {
    const { id, ...dataToUpdate } = productData;
    if (!id) throw new Error("Product ID is required to update.");
    await setDoc(doc(db, 'products', id), dataToUpdate, { merge: true });
};


export const deleteProduct = async(id: string) => {
    await deleteDoc(doc(db, 'products', id));
};


// ORDER & PAYMENT FUNCTIONS

async function readNextId(transaction: Transaction, counterName: string): Promise<number> {
    const counterRef = doc(db, "counters", counterName);
    const counterSnap = await transaction.get(counterRef);
    if (counterSnap.exists()) {
        return counterSnap.data().currentNumber + 1;
    }
    return 1;
}

function writeNextId(transaction: Transaction, counterName: string, nextNumber: number): void {
    const counterRef = doc(db, "counters", counterName);
    transaction.set(counterRef, { currentNumber: nextNumber }, { merge: true });
}

function _recalculateBalances(orders: Order[]): Order[] {
    let previousBalanceDue = 0;
    const updatedOrders = [...orders]; // Create a mutable copy

    updatedOrders.sort((a, b) => {
        const dateA = new Date(a.orderDate).getTime();
        const dateB = new Date(b.orderDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.id || '').localeCompare(b.id || '');
    });

    for (const order of updatedOrders) {
        const currentInvoiceTotal = order.total - order.discount + order.deliveryFees;
        const newGrandTotal = currentInvoiceTotal + previousBalanceDue;
        const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const newBalanceDue = newGrandTotal - totalPaid;

        order.previousBalance = previousBalanceDue;
        order.grandTotal = newGrandTotal;
        order.balanceDue = newBalanceDue;
        order.status = newBalanceDue <= 0 ? 'Fulfilled' : 'Pending';

        previousBalanceDue = newBalanceDue;
    }

    return updatedOrders;
}


export const addOrder = async (orderData: Omit<Order, 'id' | 'customerName' | 'previousBalance' | 'grandTotal' | 'balanceDue' | 'status'>): Promise<Order> => {
    let newOrderWithId!: Order;
    
    await runTransaction(db, async (transaction) => {
        // --- READS ---
        const customerRef = doc(db, "customers", orderData.customerId);
        const customerSnap = await transaction.get(customerRef);
        if (!customerSnap.exists()) throw new Error("Customer not found");

        const nextIdNumber = await readNextId(transaction, 'orderCounter');
        
        const ordersQuery = query(collection(db, 'orders'), where('customerId', '==', orderData.customerId));
        const customerOrdersSnap = await transaction.get(ordersQuery);
        let customerOrders = customerOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));

        // --- PREPARE WRITES (IN-MEMORY) ---
        const orderId = `ORD-${String(nextIdNumber).padStart(4, '0')}`;
        
        newOrderWithId = { 
            ...orderData, 
            id: orderId, 
            customerName: customerSnap.data().name,
            previousBalance: 0,
            grandTotal: 0,
            balanceDue: 0,
            status: 'Pending',
        };

        newOrderWithId.isOpeningBalance = orderData.items.some(item => item.productName === 'Opening Balance');

        if (newOrderWithId.payments) {
            newOrderWithId.payments = newOrderWithId.payments.map((p, i) => ({
                 ...p,
                 id: `${orderId}-PAY-${String(i + 1).padStart(2, '0')}`
            }));
        }

        const allOrdersForRecalc = [...customerOrders, newOrderWithId];
        const recalculatedOrders = _recalculateBalances(allOrdersForRecalc);
        
        // --- WRITES ---
        writeNextId(transaction, 'orderCounter', nextIdNumber);
        
        if (!newOrderWithId.isOpeningBalance) {
            const currentInvoiceTotal = newOrderWithId.total - newOrderWithId.discount + newOrderWithId.deliveryFees;
            transaction.update(customerRef, {
                'transactionHistory.totalSpent': increment(currentInvoiceTotal),
                'transactionHistory.lastPurchaseDate': newOrderWithId.orderDate
            });
        }
        
        for (const item of newOrderWithId.items) {
            if(item.productId !== 'OPENING_BALANCE') {
                const productRef = doc(db, "products", item.productId);
                transaction.update(productRef, { stock: increment(-item.quantity) });
            }
        }

        for (const order of recalculatedOrders) {
            const orderRef = doc(db, 'orders', order.id);
            transaction.set(orderRef, order);
        }
    });

    return newOrderWithId;
};

export const updateOrder = async (orderData: Order): Promise<void> => {
    if (!orderData.id) throw new Error("Order ID is required to update.");

    await runTransaction(db, async (transaction) => {
        // --- READS ---
        const originalOrderRef = doc(db, "orders", orderData.id);
        const originalOrderSnap = await transaction.get(originalOrderRef);
        if (!originalOrderSnap.exists()) throw new Error("Order to update not found.");
        const originalOrder = { id: originalOrderSnap.id, ...originalOrderSnap.data() } as Order;

        const customerRef = doc(db, "customers", orderData.customerId);

        const ordersQuery = query(collection(db, 'orders'), where('customerId', '==', orderData.customerId));
        const customerOrdersSnap = await transaction.get(ordersQuery);
        let customerOrders = customerOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        
        // --- PREPARE WRITES (IN-MEMORY) ---
        orderData.isOpeningBalance = orderData.items.some(item => item.productName === 'Opening Balance');

        const orderIndex = customerOrders.findIndex(o => o.id === orderData.id);
        customerOrders[orderIndex] = orderData; // Replace old order with new data for recalculation

        const recalculatedOrders = _recalculateBalances(customerOrders);

        // --- WRITES ---
        // 1. Revert stock from original order
        for (const item of originalOrder.items) {
             if (item.productId !== 'OPENING_BALANCE') {
                transaction.update(doc(db, "products", item.productId), { stock: increment(item.quantity) });
            }
        }
        // 2. Decrement new stock
        for (const item of orderData.items) {
             if (item.productId !== 'OPENING_BALANCE') {
                transaction.update(doc(db, "products", item.productId), { stock: increment(-item.quantity) });
            }
        }

        // 3. Update customer totalSpent
        let netValueDifference = 0;
        const originalNetValue = originalOrder.total - originalOrder.discount + originalOrder.deliveryFees;
        const newNetValue = orderData.total - orderData.discount + orderData.deliveryFees;
        if (originalOrder.isOpeningBalance && !orderData.isOpeningBalance) netValueDifference = newNetValue;
        else if (!originalOrder.isOpeningBalance && orderData.isOpeningBalance) netValueDifference = -originalNetValue;
        else if (!originalOrder.isOpeningBalance && !orderData.isOpeningBalance) netValueDifference = newNetValue - originalNetValue;
        if (netValueDifference !== 0) {
             transaction.update(customerRef, { 'transactionHistory.totalSpent': increment(netValueDifference) });
        }

        // 4. Write all recalculated orders
        for (const order of recalculatedOrders) {
            transaction.set(doc(db, 'orders', order.id), order);
        }
    });
};


export const deleteOrder = async (orderToDelete: Order): Promise<void> => {
    if (!orderToDelete.id) throw new Error("Order ID is required for deletion.");
    
    await runTransaction(db, async (transaction) => {
        // --- READS ---
        const customerRef = doc(db, "customers", orderToDelete.customerId);

        const ordersQuery = query(collection(db, 'orders'), where('customerId', '==', orderToDelete.customerId));
        const customerOrdersSnap = await transaction.get(ordersQuery);
        let customerOrders = customerOrdersSnap.docs.map(d => ({id: d.id, ...d.data()}) as Order);

        // --- PREPARE WRITES (IN-MEMORY) ---
        const filteredOrders = customerOrders.filter(o => o.id !== orderToDelete.id);
        const recalculatedOrders = _recalculateBalances(filteredOrders);

        // --- WRITES ---
        transaction.delete(doc(db, "orders", orderToDelete.id));

        if (!orderToDelete.isOpeningBalance) {
            const netOrderValue = orderToDelete.total - orderToDelete.discount + orderToDelete.deliveryFees;
            transaction.update(customerRef, {
                'transactionHistory.totalSpent': increment(-netOrderValue)
            });
        }

        for (const item of orderToDelete.items) {
            if(item.productId !== 'OPENING_BALANCE' && item.productName !== 'Outstanding Balance') {
                const productRef = doc(db, "products", item.productId);
                transaction.update(productRef, { stock: increment(item.quantity) });
            }
        }

        for (const order of recalculatedOrders) {
            transaction.set(doc(db, 'orders', order.id), order);
        }
    });
}

export const addPaymentToOrder = async (orderId: string, payment: Omit<Payment, 'id'>): Promise<Order> => {
    let finalOrderState!: Order;

    await runTransaction(db, async (transaction) => {
        // --- READS ---
        const targetedOrderRef = doc(db, "orders", orderId);
        const targetedOrderSnap = await transaction.get(targetedOrderRef);
        if (!targetedOrderSnap.exists()) {
            throw new Error(`Order with ID ${orderId} not found.`);
        }
        const customerId = targetedOrderSnap.data().customerId;
        if (!customerId) {
            throw new Error(`Order with ID ${orderId} has no customerId.`);
        }

        const ordersQuery = query(collection(db, 'orders'), where('customerId', '==', customerId));
        const customerOrdersSnap = await transaction.get(ordersQuery);
        let customerOrders = customerOrdersSnap.docs.map(d => ({id: d.id, ...d.data()}) as Order);
        
        // --- PREPARE WRITES (IN-MEMORY) ---
        const orderIndex = customerOrders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            throw new Error("Order not found in customer's history for payment.");
        }
        
        const orderToUpdate = { ...customerOrders[orderIndex] }; 
        const existingPayments = orderToUpdate.payments || [];
        const paymentId = `${orderId}-PAY-${String(existingPayments.length + 1).padStart(2, '0')}`;
        const newPayment: Payment = { ...payment, id: paymentId };
        
        orderToUpdate.payments = [...existingPayments, newPayment];
        
        // Replace the old order data with the updated order data in the array
        customerOrders[orderIndex] = orderToUpdate;
        
        const recalculatedOrders = _recalculateBalances(customerOrders);
        finalOrderState = recalculatedOrders.find(o => o.id === orderId)!;

        // --- WRITES ---
        for (const order of recalculatedOrders) {
            const orderRef = doc(db, 'orders', order.id);
            transaction.set(orderRef, order);
        }
    });
    
    return finalOrderState;
};



// SUPPLIER FUNCTIONS
export const getSuppliers = async (): Promise<Supplier[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'suppliers'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
    } catch (error) {
        console.error("Error fetching suppliers: ", error);
        return [];
    }
};

export const addSupplier = async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
    const docRef = await addDoc(collection(db, 'suppliers'), supplierData);
    return { id: docRef.id, ...supplierData };
};

export const updateSupplier = async (supplierData: Supplier): Promise<void> => {
    const { id, ...dataToUpdate } = supplierData;
    if (!id) throw new Error("Supplier ID is required to update.");
    await setDoc(doc(db, 'suppliers', id), dataToUpdate, { merge: true });
};

export const deleteSupplier = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'suppliers', id));
};

// PURCHASE FUNCTIONS
export const getPurchases = async (): Promise<Purchase[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'purchases'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
    } catch (error) {
        console.error("Error fetching purchases: ", error);
        return [];
    }
};

export const addPurchase = async (purchaseData: Omit<Purchase, 'id' | 'supplierName'>): Promise<Purchase> => {
    
    let newPurchaseWithId!: Purchase;

    await runTransaction(db, async (transaction) => {
        // --- READS ---
        const supplierRef = doc(db, "suppliers", purchaseData.supplierId);
        const supplierSnap = await transaction.get(supplierRef);
        const nextIdNumber = await readNextId(transaction, 'purchaseCounter');

        // --- WRITES ---
        if (!supplierSnap.exists()) throw new Error("Supplier not found");
        const supplierName = supplierSnap.data()?.name;
        const purchaseId = `PUR-${String(nextIdNumber).padStart(4, '0')}`;

        newPurchaseWithId = { ...purchaseData, supplierName, id: purchaseId };
        
        if (newPurchaseWithId.payments) {
            newPurchaseWithId.payments = newPurchaseWithId.payments.map((p, i) => ({
                ...p,
                id: `${purchaseId}-PAY-${String(i + 1).padStart(2, '0')}`
            }));
        }

        transaction.set(doc(db, "purchases", purchaseId), newPurchaseWithId);

        writeNextId(transaction, 'purchaseCounter', nextIdNumber);

        for (const item of newPurchaseWithId.items) {
            const productRef = doc(db, "products", item.productId);
            transaction.update(productRef, { stock: increment(item.quantity) });
        }
    });
    return newPurchaseWithId;
};

export const addPaymentToPurchase = async (purchaseId: string, payment: Omit<PurchasePayment, 'id'>): Promise<Purchase> => {
    const purchaseRef = doc(db, "purchases", purchaseId);
    let updatedPurchase!: Purchase;

    await runTransaction(db, async (transaction) => {
        const purchaseSnap = await transaction.get(purchaseRef);
        if (!purchaseSnap.exists()) throw new Error("Purchase not found!");

        const purchase = { id: purchaseSnap.id, ...purchaseSnap.data() } as Purchase;
        const existingPayments = purchase.payments || [];
        const paymentId = `${purchase.id}-PAY-${String(existingPayments.length + 1).padStart(2, '0')}`;
        const newPayment: PurchasePayment = { ...payment, id: paymentId };
        const newBalance = purchase.balanceDue - newPayment.amount;

        updatedPurchase = {
            ...purchase,
            payments: [...existingPayments, newPayment],
            balanceDue: newBalance,
        };

        transaction.update(purchaseRef, {
            payments: updatedPurchase.payments,
            balanceDue: updatedPurchase.balanceDue,
        });
    });
    return updatedPurchase;
};

// DASHBOARD & REPORTING DATA
export const getDashboardData = async () => {
    const {orders, customers, products} = await getAllData();
    const today = startOfToday();

    // Basic Dashboard Stats
    const totalRevenue = orders.reduce((sum, order) => {
        const orderPayments = order.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) ?? 0;
        return sum + orderPayments;
    }, 0);

    const totalBalanceDue = orders.reduce((acc, order) => acc + (order.balanceDue ?? 0), 0);


    const totalCustomers = customers.length;
    
    const itemsInStock = products
        .filter(p => p.name !== 'Outstanding Balance')
        .reduce((sum, product) => sum + product.stock, 0);
        
    const ordersPlaced = orders.filter(o => o.status !== 'Canceled').length;
    
    // Alerts
    const upcomingDateLimit = addDays(today, 7);
    const paymentAlerts = orders
        .filter(order => 
            order.status === 'Pending' && 
            order.dueDate && 
            (order.balanceDue ?? 0) > 0
        )
        .map(order => {
            const dueDate = new Date(order.dueDate);
            const days = differenceInDays(dueDate, today);
            return {
                orderId: order.id,
                customerName: order.customerName,
                dueDate: order.dueDate!,
                balanceDue: order.balanceDue!,
                isOverdue: days < 0,
                days: days
            };
        })
        .filter(alert => 
            alert.isOverdue || 
            (alert.dueDate && new Date(alert.dueDate) <= upcomingDateLimit)
        )
        .sort((a, b) => a.days - b.days);

    const lowStockAlerts: LowStockAlert[] = products
        .filter(p => p.reorderPoint !== undefined && p.reorderPoint > 0 && p.stock <= p.reorderPoint && p.name !== 'Outstanding Balance')
        .map(p => ({
            productId: p.id,
            productName: p.name,
            stock: p.stock,
            reorderPoint: p.reorderPoint!
        }))
        .sort((a,b) => a.stock - b.stock);

    // BI Report Data: Profitability & Top Products
    const monthlyData: Record<string, { revenue: number, profit: number }> = {};
    const productPerformance: Record<string, { productId: string, productName: string, unitsSold: number, totalRevenue: number, estimatedProfit: number }> = {};

    orders.forEach(order => {
        const month = new Date(order.orderDate).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, profit: 0 };
        }
        
        order.items.forEach(item => {
            if(item.productName === 'Outstanding Balance' || item.productName === 'Opening Balance') return;

            const revenue = item.price * item.quantity;
            const cost = item.cost * item.quantity;
            const profit = revenue - cost;
            
            monthlyData[month].revenue += revenue;
            monthlyData[month].profit += profit;
            
            if (!productPerformance[item.productId]) {
                 productPerformance[item.productId] = { productId: item.productId, productName: item.productName, unitsSold: 0, totalRevenue: 0, estimatedProfit: 0 };
            }
            productPerformance[item.productId].unitsSold += item.quantity;
            productPerformance[item.productId].totalRevenue += revenue;
            productPerformance[item.productId].estimatedProfit += profit;
        });
    });

    const profitabilityChartData = Object.entries(monthlyData).map(([month, data]) => ({ month, revenue: data.revenue, profit: data.profit }));
    
    // BI Report Data: Inventory Intelligence
    const oneYearAgo = subMonths(today, 12);
    const sixMonthsAgo = subMonths(today, 6);

    const cogsLastYear = orders
        .filter(o => new Date(o.orderDate) >= oneYearAgo)
        .reduce((sum, order) => {
            return sum + order.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0);
        }, 0);

    const averageInventoryValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const inventoryTurnoverRate = averageInventoryValue > 0 ? cogsLastYear / averageInventoryValue : 0;

    const soldProductIds = new Set(orders
        .filter(o => new Date(o.orderDate) >= sixMonthsAgo)
        .flatMap(o => o.items.map(i => i.productId))
    );
    const deadStock = products
        .filter(p => !soldProductIds.has(p.id) && p.name !== 'Outstanding Balance' && p.stock > 0)
        .map(p => ({
            productName: p.name,
            sku: p.sku,
            stock: p.stock,
            cost: p.cost
        }));
    
    const stockoutProducts = products
        .filter(p => p.stock === 0 && p.name !== 'Outstanding Balance')
        .map(p => {
            const salesHistory = orders
                .flatMap(o => o.items)
                .filter(i => i.productId === p.id);

            const totalDays = salesHistory.length > 0
                ? differenceInDays(today, new Date(orders.find(o => o.items.some(i => i.productId === p.id))!.orderDate))
                : 0;
            
            const totalUnitsSold = salesHistory.reduce((sum, i) => sum + i.quantity, 0);
            const avgDailySales = totalDays > 0 ? totalUnitsSold / totalDays : 0;
            const potentialLostRevenue = avgDailySales * p.price;

            return {
                productName: p.name,
                avgDailySales: avgDailySales.toFixed(2),
                potentialLostRevenuePerDay: potentialLostRevenue
            };
        });


    return {
        // Dashboard data
        totalRevenue,
        totalBalanceDue,
        totalCustomers,
        itemsInStock,
        ordersPlaced,
        recentOrders: orders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5).map(o => ({...o, total: o.grandTotal})),
        paymentAlerts,
        lowStockAlerts,
        // Reporting data
        profitabilityChartData,
        productPerformance: Object.values(productPerformance),
        inventoryTurnoverRate: inventoryTurnoverRate.toFixed(2),
        deadStock,
        stockoutProducts,
    };
};

// This function will be called from a server-side context to reset the DB
export const resetDatabaseForFreshStart = async () => {
    const collectionsToDelete = ['customers', 'orders', 'counters', 'suppliers', 'purchases'];
    
    try {
        for (const collectionName of collectionsToDelete) {
            const q = query(collection(db, collectionName));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                console.log(`No documents to delete in ${collectionName}.`);
                continue;
            }
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                console.log(`Scheduling deletion for doc ${doc.id} in ${collectionName}`);
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`All documents in ${collectionName} deleted.`);
        }

        console.log("Database collections have been cleared.");

    } catch (error) {
        console.error("Error during database reset:", error);
        throw new Error("Failed to reset the database.");
    }
};

    





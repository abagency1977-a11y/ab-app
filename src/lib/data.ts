
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, writeBatch, getDoc, query, limit, runTransaction, DocumentReference, updateDoc, increment, where } from 'firebase/firestore';
import type { Customer, Product, Order, Payment, OrderItem } from './types';

// MOCK DATA - This will be used to seed the database for the first time.
const mockCustomers: Omit<Customer, 'id'>[] = [];

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
    name: 'Opening Balance',
    sku: 'OB-001',
    stock: 9999,
    price: 1,
    gst: 0,
    historicalData: []
  }
];

const mockOrders: Omit<Order, 'id'>[] = [];


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

export const getCustomerBalance = async (customerId: string): Promise<number> => {
    if (!customerId) return 0;
    try {
        const ordersQuery = query(collection(db, 'orders'), where('customerId', '==', customerId));
        const snapshot = await getDocs(ordersQuery);
        const totalBalance = snapshot.docs.reduce((acc, doc) => {
            const order = doc.data() as Order;
            return acc + (order.balanceDue ?? 0);
        }, 0);
        return totalBalance;
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
    
    let newOrderWithId: Order;

    try {
        await runTransaction(db, async (transaction) => {
            const customerSnap = await transaction.get(customerRef);
            if (!customerSnap.exists()) {
                throw new Error("Customer not found");
            }
            const customerName = customerSnap.data()?.name;
            if (!customerName) {
                throw new Error(`Customer with ID ${orderData.customerId} has no name.`);
            }

            const orderId = await getNextId('orderCounter', 'ORD');
            newOrderWithId = { ...orderData, customerName, id: orderId };

            if (newOrderWithId.payments) {
                let paymentCounter = 0;
                newOrderWithId.payments = newOrderWithId.payments.map(p => {
                    paymentCounter++;
                    const paymentId = `${orderId}-PAY-${String(paymentCounter).padStart(2, '0')}`;
                    return { ...p, id: paymentId };
                });
            }
            
            // In a transaction, first read all data, then write.
            // Settle previous balances if any.
            if (orderData.previousBalance && orderData.previousBalance > 0) {
                 const outstandingOrdersQuery = query(
                    collection(db, 'orders'), 
                    where('customerId', '==', orderData.customerId), 
                    where('balanceDue', '>', 0)
                );
                const outstandingDocs = await getDocs(outstandingOrdersQuery);
                
                // Set the previous balance on the new order from the provided data
                newOrderWithId.previousBalance = orderData.previousBalance;

                // Clear the balance on all old orders
                outstandingDocs.forEach(docSnap => {
                    if (docSnap.id !== orderId) { // Don't clear the balance of the order we are just creating
                        transaction.update(docSnap.ref, { balanceDue: 0 });
                    }
                });
            }


            // 1. Create the new order document
            transaction.set(doc(db, "orders", orderId), newOrderWithId);

            // 2. Update the customer's transaction history
            transaction.update(customerRef, {
                'transactionHistory.totalSpent': increment(newOrderWithId.grandTotal),
                'transactionHistory.lastPurchaseDate': newOrderWithId.orderDate
            });

            // 3. Decrement stock for each item in the order
            for (const item of newOrderWithId.items) {
                const productRef = doc(db, "products", item.productId);
                transaction.update(productRef, { stock: increment(-item.quantity) });
            }
        });

        // After successful transaction, return the new order data
        return newOrderWithId!;
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

export const deleteOrder = async (order: Order): Promise<void> => {
    if (!order.id) throw new Error("Order ID is required for deletion.");
    const orderRef = doc(db, "orders", order.id);
    const customerRef = doc(db, "customers", order.customerId);

    try {
        await runTransaction(db, async (transaction) => {
            const customerSnap = await transaction.get(customerRef);

            transaction.delete(orderRef);

            if (customerSnap.exists() && order.status !== 'Canceled') {
                transaction.update(customerRef, {
                    'transactionHistory.totalSpent': increment(-order.grandTotal)
                });
            }

            if (order.status !== 'Canceled') {
                for (const item of order.items) {
                    const productRef = doc(db, "products", item.productId);
                    transaction.update(productRef, { stock: increment(item.quantity) });
                }
            }
        });
    } catch(e) {
        console.error("Delete order transaction failed: ", e);
         if (e instanceof Error) {
            throw new Error(`Failed to delete order ${order.id}. Details: ${e.message}`);
        }
        throw new Error(`Failed to delete order ${order.id} due to an unknown error.`);
    }
}

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
    const ordersPlaced = orders.filter(o => o.status !== 'Canceled').length;

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
        ordersPlaced,
        revenueChartData,
        recentOrders: orders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5).map(o => ({...o, total: o.grandTotal})),
    };
};

// This function will be called from a server-side context to reset the DB
export const resetDatabaseForFreshStart = async () => {
    try {
        const collectionsToDelete = ['customers', 'orders', 'products'];
        
        for (const collectionName of collectionsToDelete) {
            const snapshot = await getDocs(collection(db, collectionName));
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log(`All documents in ${collectionName} deleted.`);
        }

        const counterRef = doc(db, 'counters', 'orderCounter');
        await setDoc(counterRef, { currentNumber: 0 });
        console.log("Order counter has been reset.");

        await seedDatabase();

    } catch (error) {
        console.error("Error during database reset:", error);
        throw new Error("Failed to reset the database.");
    }
};

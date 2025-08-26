
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, writeBatch, getDoc, query, limit, runTransaction, DocumentReference, updateDoc, increment, where, orderBy, Transaction } from 'firebase/firestore';
import type { Customer, Product, Order, Payment, OrderItem, PaymentAlert, LowStockAlert, Supplier, Purchase, PurchasePayment, OrderStatus, PaymentMode } from './types';
import { differenceInDays, addDays, startOfToday, subMonths } from 'date-fns';

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


// CUSTOMER FUNCTIONS
export const getCustomers = async (): Promise<Customer[]> => {
    try {
        const snapshot = await getDocs(query(collection(db, 'customers'), orderBy('name')));
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
        
        if (snapshot.empty) return 0;

        const orders = snapshot.docs.map(doc => doc.data() as Order);
        
        orders.sort((a, b) => {
            const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
            const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
            if(isNaN(dateA) || isNaN(dateB)) return 0; // handle invalid dates
            return dateA - dateB;
        });

        const latestOrder = orders[orders.length - 1];

        return latestOrder.balanceDue && latestOrder.balanceDue > 0 ? latestOrder.balanceDue : 0;

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

export const updateCustomer = async (customerData: Partial<Customer>): Promise<void> => {
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

export const updateProduct = async (productData: Partial<Product>): Promise<void> => {
    const { id, ...dataToUpdate } = productData;
    if (!id) throw new Error("Product ID is required to update.");
    await setDoc(doc(db, 'products', id), dataToUpdate, { merge: true });
};


export const deleteProduct = async(id: string) => {
    await deleteDoc(doc(db, 'products', id));
};


// ORDER & PAYMENT FUNCTIONS

async function getNextId(transaction: Transaction, counterName: string, prefix: string): Promise<string> {
    const counterRef = doc(db, "counters", counterName);
    const counterSnap = await transaction.get(counterRef);
    let nextNumber = 1;
    if (counterSnap.exists()) {
        nextNumber = counterSnap.data().currentNumber + 1;
    }
    transaction.set(counterRef, { currentNumber: nextNumber }, { merge: true });
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

type Workload = (orders: Order[]) => Order[];

async function runBalanceChainUpdate(customerId: string, workload: Workload) {
    try {
        await runTransaction(db, async (transaction) => {
            const ordersQuery = query(collection(db, 'orders'), where('customerId', '==', customerId));
            const customerOrdersSnap = await transaction.get(ordersQuery);
            let orders = customerOrdersSnap.docs.map(d => ({id: d.id, ...d.data()}) as Order);

            // Apply the specific operation (add, update, delete, pay)
            orders = workload(orders);

            // Sort by date to ensure correct calculation sequence
            orders.sort((a, b) => {
                const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
                const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
                if(isNaN(dateA)) return -1;
                if(isNaN(dateB)) return 1;
                return dateA - dateB;
            });

            // Recalculate the entire chain
            let runningPreviousBalance = 0;
            for (const order of orders) {
                order.previousBalance = runningPreviousBalance;
                
                const currentBillValue = order.total - order.discount + order.deliveryFees;
                order.grandTotal = currentBillValue + order.previousBalance;
                
                const totalPaid = (order.payments || []).reduce((sum, p) => sum + p.amount, 0);
                order.balanceDue = order.grandTotal - totalPaid;
                order.status = order.balanceDue <= 0 ? 'Fulfilled' : 'Pending';

                runningPreviousBalance = order.balanceDue > 0 ? order.balanceDue : 0;
            }

            // Write all updated orders back to the database
            for (const order of orders) {
                const orderRef = doc(db, 'orders', order.id);
                transaction.set(orderRef, order);
            }
        });
    } catch (e) {
        console.error("runBalanceChainUpdate transaction failed:", e);
        if (e instanceof Error) {
            throw new Error(`A database error occurred: ${e.message}`);
        }
        throw new Error("An unknown database error occurred during the transaction.");
    }
}

export const addOrder = async (orderData: Omit<Order, 'id' | 'customerName'>): Promise<Order> => {
    let finalNewOrder : Order | null = null;
    
    await runTransaction(db, async(transaction) => {
        const customerRef = doc(db, 'customers', orderData.customerId);
        const customerSnap = await transaction.get(customerRef);
        if (!customerSnap.exists()) throw new Error("Customer not found");
        
        const customerName = customerSnap.data()?.name;
        
        const newOrderId = await getNextId(transaction, 'orderCounter', 'ORD');

        let newOrder: Order = {
            ...orderData,
            id: newOrderId!,
            customerName: customerName,
            isOpeningBalance: orderData.items.some(item => item.productName === 'Opening Balance'),
            balanceDue: 0, 
            previousBalance: 0,
            grandTotal: 0,
            status: 'Pending',
        };

        if (newOrder.paymentTerm === 'Full Payment' && newOrder.payments && newOrder.payments.length > 0) {
            newOrder.payments[0].id = `${newOrderId}-PAY-01`;
        }

        finalNewOrder = newOrder; // Store for return value

        await runBalanceChainUpdate(orderData.customerId, (orders) => {
            return [...orders, newOrder];
        });

        if (!newOrder.isOpeningBalance) {
            const netOrderValue = newOrder.total - newOrder.discount + newOrder.deliveryFees;
            transaction.update(customerRef, {
                'transactionHistory.totalSpent': increment(netOrderValue),
                'transactionHistory.lastPurchaseDate': newOrder.orderDate
            });
        }
        
        for (const item of newOrder.items) {
            if (item.productId !== 'OPENING_BALANCE') {
                const productRef = doc(db, "products", item.productId);
                transaction.update(productRef, { stock: increment(-item.quantity) });
            }
        }
    });
    
    if (!finalNewOrder) throw new Error("Failed to create the new order.");
    return finalNewOrder;
};


export const updateOrder = async (orderData: Order): Promise<void> => {
    if (!orderData.id) throw new Error("Order ID is required to update.");

    await runTransaction(db, async (transaction) => {
        const originalOrderSnap = await getDoc(doc(db, "orders", orderData.id));
        if (!originalOrderSnap.exists()) throw new Error("Cannot update order that does not exist.");

        const originalOrder = originalOrderSnap.data() as Order;

        for (const item of originalOrder.items) {
            if(item.productId !== 'OPENING_BALANCE') {
                transaction.update(doc(db, "products", item.productId), { stock: increment(item.quantity) });
            }
        }
        if (!originalOrder.isOpeningBalance) {
            const originalNetValue = originalOrder.total - originalOrder.discount + originalOrder.deliveryFees;
            transaction.update(doc(db, "customers", originalOrder.customerId), { 'transactionHistory.totalSpent': increment(-originalNetValue) });
        }

        orderData.isOpeningBalance = orderData.items.some(item => item.productName === 'Opening Balance');
        for (const item of orderData.items) {
            if(item.productId !== 'OPENING_BALANCE') {
                transaction.update(doc(db, "products", item.productId), { stock: increment(-item.quantity) });
            }
        }
        if (!orderData.isOpeningBalance) {
            const newNetValue = orderData.total - orderData.discount + orderData.deliveryFees;
            transaction.update(doc(db, "customers", orderData.customerId), { 'transactionHistory.totalSpent': increment(newNetValue) });
        }
        
        await runBalanceChainUpdate(orderData.customerId, (orders) => 
            orders.map(o => o.id === orderData.id ? orderData : o)
        );
    });
};


export const deleteOrder = async (orderToDelete: Order): Promise<void> => {
    if (!orderToDelete.id) throw new Error("Order ID is required for deletion.");
    
    await runTransaction(db, async (transaction) => {
        
        await runBalanceChainUpdate(orderToDelete.customerId, (orders) => 
            orders.filter(o => o.id !== orderToDelete.id)
        );

        transaction.delete(doc(db, "orders", orderToDelete.id));

        for (const item of orderToDelete.items) {
             if(item.productId !== 'OPENING_BALANCE') {
                transaction.update(doc(db, "products", item.productId), { stock: increment(item.quantity) });
            }
        }
        if (!orderToDelete.isOpeningBalance) {
            const netValue = orderToDelete.total - orderToDelete.discount + orderToDelete.deliveryFees;
            transaction.update(doc(db, "customers", orderToDelete.customerId), { 'transactionHistory.totalSpent': increment(-netValue) });
        }
    });
};

export const addPaymentToOrder = async (orderId: string, payment: Omit<Payment, 'id'>): Promise<void> => {
    let customerId = '';
    
    // First, get the customerId from the order. This is a read outside the main transaction.
    try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
            customerId = orderSnap.data().customerId;
        } else {
            throw new Error(`Order ${orderId} not found.`);
        }
    } catch(e) {
        console.error("Failed to fetch order for payment:", e);
        if (e instanceof Error) {
            throw new Error(`Failed to read order details for payment: ${e.message}`);
        }
        throw new Error("An unknown error occurred while fetching order details.");
    }

    if (!customerId) {
        throw new Error(`Could not find a customer for order ${orderId}.`);
    }

    try {
        await runBalanceChainUpdate(customerId, (orders) => {
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex === -1) {
                // This should not happen if the initial check passes, but good for safety.
                throw new Error(`Order ${orderId} not found in customer's order list during transaction.`);
            }
            
            const orderToUpdate = orders[orderIndex];
            const existingPayments: Payment[] = orderToUpdate.payments || [];
            const paymentId = `${orderId}-PAY-${String(existingPayments.length + 1).padStart(2, '0')}`;
            
            // This is where we correctly append the new payment to the existing array.
            orderToUpdate.payments = [...existingPayments, { ...payment, id: paymentId }];

            return orders;
        });
    } catch(e) {
        console.error("Add payment transaction failed:", e);
        if (e instanceof Error) {
            throw new Error(`A database error occurred: ${e.message}`);
        }
        throw new Error("An unknown database error occurred during the transaction.");
    }
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

export const updateSupplier = async (supplierData: Partial<Supplier>): Promise<void> => {
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

    try {
        await runTransaction(db, async (transaction) => {
            const supplierRef = doc(db, "suppliers", purchaseData.supplierId);
            const supplierSnap = await transaction.get(supplierRef);
            if (!supplierSnap.exists()) throw new Error("Supplier not found");

            const purchaseId = await getNextId(transaction, 'purchaseCounter', 'PUR');

            newPurchaseWithId = { ...purchaseData, supplierName: supplierSnap.data()?.name, id: purchaseId };
            
            if (newPurchaseWithId.payments) {
                newPurchaseWithId.payments = newPurchaseWithId.payments.map((p, i) => ({
                    ...p,
                    id: `${purchaseId}-PAY-${String(i + 1).padStart(2, '0')}`
                }));
            }

            transaction.set(doc(db, "purchases", purchaseId), newPurchaseWithId);

            for (const item of newPurchaseWithId.items) {
                const productRef = doc(db, "products", item.productId);
                transaction.update(productRef, { stock: increment(item.quantity) });
            }
        });
    } catch(e) {
         console.error("Add purchase transaction failed:", e);
        if (e instanceof Error) throw new Error(`A database error occurred: ${e.message}`);
        throw new Error("An unknown database error occurred during the transaction.");
    }
    return newPurchaseWithId;
};

export const addPaymentToPurchase = async (purchaseId: string, payment: Omit<PurchasePayment, 'id'>): Promise<Purchase> => {
    const purchaseRef = doc(db, "purchases", purchaseId);
    let updatedPurchase!: Purchase;

    try {
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
    } catch(e) {
        console.error("Add payment to purchase transaction failed:", e);
        if (e instanceof Error) throw new Error(`A database error occurred: ${e.message}`);
        throw new Error("An unknown database error occurred during the transaction.");
    }
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

    let totalBalanceDue = 0;
    for (const customer of customers) {
        const balance = await getCustomerBalance(customer.id);
        totalBalanceDue += balance;
    }


    const totalCustomers = customers.length;
    
    const itemsInStock = products
        .filter(p => p.name !== 'Outstanding Balance')
        .reduce((sum, product) => sum + product.stock, 0);
        
    const ordersPlaced = orders.filter(o => o.status !== 'Canceled').length;
    
    // Alerts
    const upcomingDateLimit = addDays(today, 7);
    const paymentAlerts = orders
        .filter(order => 
            order.dueDate && 
            (order.balanceDue ?? 0) > 0
        )
        .map(order => {
            const dueDate = new Date(order.dueDate!);
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
            (new Date(alert.dueDate) <= upcomingDateLimit)
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
        recentOrders: orders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5),
        paymentAlerts,
        lowStockAlerts,
        revenueChartData: profitabilityChartData, // Added for mobile view
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

    
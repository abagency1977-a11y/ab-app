
import AppLayout from "@/components/app-layout";
import { getCustomers, getProducts } from "@/lib/data";
import { OrdersClient } from "./orders-client";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/types";

export default async function OrdersPage() {
    const customersPromise = getCustomers();
    const productsPromise = getProducts();
    const ordersPromise = getDocs(collection(db, 'orders')).then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));

    const [customers, products, orders] = await Promise.all([customersPromise, productsPromise, ordersPromise]);

    return (
        <AppLayout>
            <OrdersClient orders={orders} customers={customers} products={products} />
        </AppLayout>
    );
}

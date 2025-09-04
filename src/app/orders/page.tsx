
import AppLayout from "@/components/app-layout";
import { getCustomers, getProducts, getOrders } from "@/lib/data";
import { OrdersClient } from "./orders-client";
import type { Order } from "@/lib/types";

export default async function OrdersPage() {
    const customersPromise = getCustomers();
    const productsPromise = getProducts();
    const ordersPromise = getOrders();

    const [customers, products, orders] = await Promise.all([customersPromise, productsPromise, ordersPromise]);

    return (
        <AppLayout>
            <OrdersClient orders={orders} customers={customers} products={products} />
        </AppLayout>
    );
}

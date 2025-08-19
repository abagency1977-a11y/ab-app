
import AppLayout from "@/components/app-layout";
import { getOrders, getCustomers, getProducts } from "@/lib/data";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
    const initialOrders = await getOrders();
    const initialCustomers = await getCustomers();
    const initialProducts = await getProducts();
    return (
        <AppLayout>
            <OrdersClient orders={initialOrders} customers={initialCustomers} products={initialProducts} />
        </AppLayout>
    );
}

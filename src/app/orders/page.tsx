
import AppLayout from "@/components/app-layout";
import { getAllData } from "@/lib/data";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
    const { orders, customers, products } = await getAllData();
    return (
        <AppLayout>
            <OrdersClient orders={orders} customers={customers} products={products} />
        </AppLayout>
    );
}

    
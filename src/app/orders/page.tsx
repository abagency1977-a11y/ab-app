import AppLayout from "@/components/app-layout";
import { getOrders, getCustomers } from "@/lib/data";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
    const orders = await getOrders();
    const customers = await getCustomers();
    return (
        <AppLayout>
            <OrdersClient orders={orders} customers={customers} />
        </AppLayout>
    );
}

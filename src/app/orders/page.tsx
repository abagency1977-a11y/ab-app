
import AppLayout from "@/components/app-layout";
import { getOrders, getCustomers } from "@/lib/data";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
    // These props are now just for initial hydration on first load.
    // The client component will manage state with localStorage.
    const initialOrders = await getOrders();
    const initialCustomers = await getCustomers();
    return (
        <AppLayout>
            <OrdersClient orders={initialOrders} customers={initialCustomers} />
        </AppLayout>
    );
}

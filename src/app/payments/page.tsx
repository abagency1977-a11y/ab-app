
import AppLayout from "@/components/app-layout";
import { getCustomers, getOrders } from "@/lib/data";
import { PaymentsClient } from "./payments-client";

export default async function PaymentsPage() {
    const ordersPromise = getOrders();
    const customersPromise = getCustomers();
    
    const [orders, customers] = await Promise.all([ordersPromise, customersPromise]);

    return (
        <AppLayout>
            <PaymentsClient orders={orders} customers={customers} />
        </AppLayout>
    );
}

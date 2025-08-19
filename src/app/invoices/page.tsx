
import AppLayout from "@/components/app-layout";
import { getOrders, getCustomers } from "@/lib/data";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
    const orders = await getOrders();
    const customers = await getCustomers();
    return (
        <AppLayout>
            <InvoicesClient orders={orders} customers={customers} />
        </AppLayout>
    );
}

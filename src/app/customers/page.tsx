
import AppLayout from "@/components/app-layout";
import { getCustomers, getOrders } from "@/lib/data";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
    // Fetch only what's needed for this page. Orders are needed for the bulk payment dialog.
    const customers = await getCustomers();
    const orders = await getOrders();
    return (
        <AppLayout>
            <CustomersClient customers={customers} orders={orders} />
        </AppLayout>
    );
}

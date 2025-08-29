
import AppLayout from "@/components/app-layout";
import { getCustomers, getAllData } from "@/lib/data";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
    // Fetch only what's needed for this page. Orders are needed for the bulk payment dialog.
    const { customers, orders } = await getAllData();
    return (
        <AppLayout>
            <CustomersClient customers={customers} orders={orders} />
        </AppLayout>
    );
}

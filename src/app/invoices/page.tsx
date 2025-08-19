
import AppLayout from "@/components/app-layout";
import { getOrders } from "@/lib/data";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
    const orders = await getOrders();
    return (
        <AppLayout>
            <InvoicesClient orders={orders} />
        </AppLayout>
    );
}

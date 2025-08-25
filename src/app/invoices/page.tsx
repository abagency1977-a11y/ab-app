
import AppLayout from "@/components/app-layout";
import { getAllData } from "@/lib/data";
import { InvoicesClient } from "./invoices-client";

export default async function InvoicesPage() {
    const { orders, customers } = await getAllData();
    return (
        <AppLayout>
            <InvoicesClient orders={orders} customers={customers} />
        </AppLayout>
    );
}

    
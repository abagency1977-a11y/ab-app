
import AppLayout from "@/components/app-layout";
import { getAllData } from "@/lib/data";
import { PaymentsClient } from "./payments-client";

export default async function PaymentsPage() {
    const { orders, customers } = await getAllData();
    return (
        <AppLayout>
            <PaymentsClient orders={orders} customers={customers} />
        </AppLayout>
    );
}

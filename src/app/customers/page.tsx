
import AppLayout from "@/components/app-layout";
import { getAllData } from "@/lib/data";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
    const { customers, orders } = await getAllData();
    return (
        <AppLayout>
            <CustomersClient customers={customers} orders={orders} />
        </AppLayout>
    );
}

    
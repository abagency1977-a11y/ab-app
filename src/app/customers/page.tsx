
import AppLayout from "@/components/app-layout";
import { getCustomers } from "@/lib/data";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
    const customers = await getCustomers();
    return (
        <AppLayout>
            <CustomersClient customers={customers} />
        </AppLayout>
    );
}

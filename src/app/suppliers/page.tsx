
import AppLayout from "@/components/app-layout";
import { getSuppliers } from "@/lib/data";
import { SuppliersClient } from "./suppliers-client";

export default async function SuppliersPage() {
    const suppliers = await getSuppliers();
    return (
        <AppLayout>
            <SuppliersClient initialSuppliers={suppliers} />
        </AppLayout>
    );
}

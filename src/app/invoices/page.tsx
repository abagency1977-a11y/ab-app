
import AppLayout from "@/components/app-layout";
import { getCustomers } from "@/lib/data";
import { InvoicesClient } from "./invoices-client";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/types";

export default async function InvoicesPage() {
    const customers = await getCustomers();
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

    return (
        <AppLayout>
            <InvoicesClient orders={orders} customers={customers} />
        </AppLayout>
    );
}

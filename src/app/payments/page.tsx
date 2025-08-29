
import AppLayout from "@/components/app-layout";
import { getCustomers } from "@/lib/data";
import { PaymentsClient } from "./payments-client";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/types";


export default async function PaymentsPage() {
    const customersPromise = getCustomers();
    const ordersPromise = getDocs(collection(db, 'orders')).then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    
    const [orders, customers] = await Promise.all([ordersPromise, customersPromise]);

    return (
        <AppLayout>
            <PaymentsClient orders={orders} customers={customers} />
        </AppLayout>
    );
}


import AppLayout from "@/components/app-layout";
import { getCustomerById, getOrders } from "@/lib/data";
import { CustomerDetailsClient } from "./customer-details-client";
import { notFound } from "next/navigation";

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
    const customer = await getCustomerById(params.id);
    if (!customer) {
        notFound();
    }
    
    const allOrders = await getOrders();
    const customerOrders = allOrders.filter(order => order.customerId === params.id);

    return (
        <AppLayout>
            <CustomerDetailsClient customer={customer} orders={customerOrders} />
        </AppLayout>
    );
}

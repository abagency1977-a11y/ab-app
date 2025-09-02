
import AppLayout from "@/components/app-layout";
import { getCustomerById, getOrdersByCustomerId } from "@/lib/data";
import { CustomerDetailsClient } from "./customer-details-client";
import { notFound } from "next/navigation";

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
    const customer = await getCustomerById(params.id);
    if (!customer) {
        notFound();
    }
    
    const customerOrders = await getOrdersByCustomerId(params.id);

    return (
        <AppLayout>
            <CustomerDetailsClient customer={customer} orders={customerOrders} />
        </AppLayout>
    );
}

    

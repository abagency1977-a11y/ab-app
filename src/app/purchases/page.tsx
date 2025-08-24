
import AppLayout from "@/components/app-layout";
import { getPurchases, getSuppliers, getProducts } from "@/lib/data";
import { PurchasesClient } from "./purchases-client";

export default async function PurchasesPage() {
    const purchases = await getPurchases();
    const suppliers = await getSuppliers();
    const products = await getProducts();
    
    return (
        <AppLayout>
            <PurchasesClient 
                initialPurchases={purchases} 
                initialSuppliers={suppliers}
                initialProducts={products}
            />
        </AppLayout>
    );
}

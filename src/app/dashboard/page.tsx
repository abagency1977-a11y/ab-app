import AppLayout from "@/components/app-layout";
import { getDashboardData } from "@/lib/data";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
    const data = await getDashboardData();
    return (
        <AppLayout>
            <DashboardClient data={data as any} />
        </AppLayout>
    );
}

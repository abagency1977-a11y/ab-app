import AppLayout from "@/components/app-layout";
import { getDashboardData } from "@/lib/data";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
    const reportData = await getDashboardData() as any;
    return (
        <AppLayout>
            <ReportsClient reportData={reportData} />
        </AppLayout>
    );
}

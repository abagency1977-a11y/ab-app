
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Pie, PieChart } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateReportNarrative } from '@/ai/flows/generate-report-narrative';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

const revenueChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;


export function ReportsClient({ reportData }: { reportData: any }) {
    const [narrative, setNarrative] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateNarrative = async () => {
        setIsLoading(true);
        setNarrative('');
        const dataSummary = `
            Total Revenue: ${formatCurrency(reportData.totalRevenue)}
            Total Customers: ${reportData.totalCustomers}
            Pending Orders: ${reportData.pendingOrders}
            Monthly Revenue: ${JSON.stringify(reportData.revenueChartData)}
        `;
        try {
            const result = await generateReportNarrative({ reportData: dataSummary });
            setNarrative(result.narrative);
        } catch (error) {
            setNarrative('Failed to generate narrative.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Reports</h1>
                <Button onClick={handleGenerateNarrative} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Generating...' : 'Generate AI Narrative'}
                </Button>
            </div>
            
            {narrative && (
                 <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>AI-Generated Report Summary</AlertTitle>
                    <AlertDescription>
                       {narrative}
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{formatCurrency(reportData.totalRevenue)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Customers</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{reportData.totalCustomers}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Items in Stock</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{reportData.itemsInStock.toLocaleString()}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Pending Orders</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{reportData.pendingOrders}</p></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Revenue Breakdown by Month</CardTitle>
                    <CardDescription>A visual representation of revenue generated each month.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={revenueChartConfig} className="h-[400px] w-full">
                        <ResponsiveContainer>
                            <LineChart data={reportData.revenueChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                                <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>} />
                                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{r: 5, fill: "hsl(var(--primary))"}} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

        </div>
    );
}

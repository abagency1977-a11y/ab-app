
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateReportNarrative } from '@/ai/flows/generate-report-narrative';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);
};


const chartConfig = {
  views: {
    label: "Page Views",
  },
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];


export function ReportsClient({ reportData }: { reportData: any }) {
    const [narrative, setNarrative] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [topProductsMetric, setTopProductsMetric] = useState<'revenue' | 'units' | 'profit'>('revenue');

    const topProductsData = useMemo(() => {
        let sortedProducts = [...reportData.productPerformance];
        
        if (topProductsMetric === 'revenue') {
            sortedProducts.sort((a, b) => b.totalRevenue - a.totalRevenue);
        } else if (topProductsMetric === 'units') {
            sortedProducts.sort((a, b) => b.unitsSold - a.unitsSold);
        } else if (topProductsMetric === 'profit') {
            sortedProducts.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
        }

        return sortedProducts.slice(0, 5);

    }, [reportData.productPerformance, topProductsMetric]);


    const handleGenerateNarrative = async () => {
        setIsLoading(true);
        setNarrative('');
        const dataSummary = `
            Total Revenue: ${formatNumber(reportData.totalRevenue)}
            Total Customers: ${reportData.totalCustomers}
            Orders Placed: ${reportData.ordersPlaced}
            Monthly Revenue: ${JSON.stringify(reportData.revenueChartData)}
            Channel Performance: ${JSON.stringify(reportData.channelPerformance)}
            Top Products by Revenue: ${JSON.stringify(reportData.productPerformance.sort((a,b) => b.totalRevenue - a.totalRevenue).slice(0,3))}
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
    
    const channelChartConfig = useMemo(() => {
        const config: ChartConfig = {};
        reportData.channelPerformance.forEach((channel: any, index: number) => {
            config[channel.channel] = {
                label: channel.channel,
                color: COLORS[index % COLORS.length]
            }
        });
        return config;
    }, [reportData.channelPerformance]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Business Health Command Center</h1>
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales Channel Performance</CardTitle>
                        <CardDescription>Breakdown of revenue by sales channel.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={channelChartConfig} className="mx-auto aspect-square h-[250px]">
                        <PieChart>
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel formatter={(value, name, item) => `${item.payload.label}: ${formatNumber(item.payload.revenue)}`} />}
                            />
                            <Pie
                                data={reportData.channelPerformance}
                                dataKey="revenue"
                                nameKey="channel"
                                innerRadius={60}
                                strokeWidth={5}
                            >
                                {reportData.channelPerformance.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Top Performing Products</CardTitle>
                                <CardDescription>Your best-selling products.</CardDescription>
                            </div>
                            <Select value={topProductsMetric} onValueChange={(v) => setTopProductsMetric(v as any)}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="revenue">Revenue</SelectItem>
                                    <SelectItem value="units">Units Sold</SelectItem>
                                    <SelectItem value="profit">Est. Profit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">
                                        {topProductsMetric === 'revenue' && 'Revenue'}
                                        {topProductsMetric === 'units' && 'Units'}
                                        {topProductsMetric === 'profit' && 'Est. Profit'}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topProductsData.map((p: any) => (
                                    <TableRow key={p.productId}>
                                        <TableCell>{p.productName}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {topProductsMetric === 'revenue' && formatNumber(p.totalRevenue)}
                                            {topProductsMetric === 'units' && p.unitsSold}
                                            {topProductsMetric === 'profit' && formatNumber(p.estimatedProfit)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profitability Over Time</CardTitle>
                    <CardDescription>A visual representation of revenue vs estimated profit each month.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={chartConfig} className="h-[400px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={reportData.profitabilityChartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis tickFormatter={(value) => formatNumber(value as number)} />
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        formatter={(value, name) => `${name === 'revenue' ? 'Revenue' : 'Est. Profit'}: ${formatNumber(value as number)}`}
                                        indicator="dot"
                                    />}
                                />
                                <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={4} />
                                <Bar dataKey="profit" fill="hsl(var(--chart-1))" radius={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

        </div>
    );
}

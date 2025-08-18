'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Boxes, ShoppingCart, DollarSign } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export function DashboardClient({ data }: { data: any }) {

    const formatCurrency = (value: number) => `₹${new Intl.NumberFormat('en-IN').format(value)}`;

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Revenue" value={formatCurrency(data.totalRevenue)} icon={DollarSign} description="Total revenue from fulfilled orders" />
                <StatCard title="Customers" value={`${data.totalCustomers}`} icon={Users} description="Total number of customers" />
                <StatCard title="Items in Stock" value={data.itemsInStock.toLocaleString()} icon={Boxes} description="Total items across all products" />
                <StatCard title="Pending Orders" value={`${data.pendingOrders}`} icon={ShoppingCart} description="Orders awaiting fulfillment" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={data.revenueChartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <YAxis tickFormatter={(value) => `₹${value / 1000}k`}/>
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        formatter={(value) => formatCurrency(value as number)}
                                        indicator="dot"
                                    />}
                                />
                                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                        <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.recentOrders.map((order: Order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <div className="font-medium">{order.customerName}</div>
                                            <div className="text-sm text-muted-foreground">{order.id}</div>
                                        </TableCell>
                                        <TableCell>
                                                <Badge variant={order.status === 'Fulfilled' ? 'default' : order.status === 'Pending' ? 'secondary' : 'destructive'} className="capitalize">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

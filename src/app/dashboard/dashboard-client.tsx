
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Boxes, CreditCard, IndianRupee, AlertTriangle, Clock, ShoppingCart, CheckCircle, CalendarCheck2, Package } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Order, PaymentAlert, LowStockAlert } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const StatCard = ({ title, value, icon: Icon, description, valueClassName }: { title: string, value: string | React.ReactNode, icon: React.ElementType, description: string, valueClassName?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);


const RecentOrdersList = ({ orders }: { orders: Order[] }) => (
    <div className="rounded-lg border shadow-sm">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map((order: Order) => (
                    <TableRow key={order.id}>
                        <TableCell>
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-muted-foreground">{order.id}</div>
                        </TableCell>
                        <TableCell className="text-center">
                                <Badge variant={order.status === 'Fulfilled' ? 'default' : order.status === 'Pending' ? 'secondary' : 'destructive'} className="capitalize">{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {formatNumber(order.grandTotal)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);

const LowStockList = ({ alerts }: { alerts: LowStockAlert[] }) => {
    if (alerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground h-40">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <p>No low stock items!</p>
                <p>All products are well-stocked.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {alerts.map(alert => (
                <div key={alert.productId} className="flex items-center">
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            <Link href={`/inventory`} className="text-blue-600 hover:underline">{alert.productName}</Link>
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Reorder at <span className="font-semibold">{alert.reorderPoint}</span> units.
                        </p>
                    </div>
                    <div className="ml-auto font-medium text-destructive">{alert.stock} units left</div>
                </div>
            ))}
        </div>
    );
};


const AlertList = ({ alerts, isOverdue }: { alerts: PaymentAlert[], isOverdue: boolean }) => {
    if (alerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground h-40">
                {isOverdue ? (
                    <>
                        <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                        <p>No overdue payments!</p>
                        <p>All accounts are settled.</p>
                    </>
                ) : (
                    <>
                        <CalendarCheck2 className="h-8 w-8 text-primary mb-2" />
                        <p>No upcoming payments</p>
                        <p>in the next 7 days.</p>
                    </>
                )}
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {alerts.map(alert => (
                <div key={alert.orderId} className="flex items-center">
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {alert.customerName} - <Link href={`/invoices`} className="text-blue-600 hover:underline">{alert.orderId.replace('ORD', 'INV')}</Link>
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Due: {new Date(alert.dueDate).toLocaleDateString('en-IN')} ({isOverdue ? `${Math.abs(alert.days)} days ago` : `in ${alert.days} days`})
                        </p>
                    </div>
                    <div className="ml-auto font-medium">{formatNumber(alert.balanceDue)}</div>
                </div>
            ))}
        </div>
    );
};


export function DashboardClient({ data }: { data: any }) {
    const overdueAlerts = data.paymentAlerts.filter((a: PaymentAlert) => a.isOverdue);
    const upcomingAlerts = data.paymentAlerts.filter((a: PaymentAlert) => !a.isOverdue);
    const lowStockAlerts = data.lowStockAlerts;

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Total Revenue" 
                    value={<>{formatNumber(data.totalRevenue)}</>}
                    icon={IndianRupee} 
                    description="Total cash received from all payments"
                    valueClassName="text-green-600"
                />
                 <StatCard 
                    title="Total Due" 
                    value={<>{formatNumber(data.totalBalanceDue)}</>}
                    icon={CreditCard} 
                    description="Total outstanding balance from customers"
                    valueClassName="text-red-600"
                />
                <StatCard title="Customers" value={`${data.totalCustomers}`} icon={Users} description="Total number of customers" />
                <StatCard title="Items in Stock" value={data.itemsInStock.toLocaleString()} icon={Boxes} description="Total items across all products" />
            </div>
            
            {/* Desktop Layout: Side-by-side */}
            <div className="hidden lg:grid grid-cols-2 gap-6 items-start">
                 <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                         <CardDescription>Monthly revenue summary.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
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
                                <YAxis tickFormatter={(value) => `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol', notation: 'compact' }).format(value as number)}`}/>
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        formatter={(value) => `${formatNumber(value as number)}`}
                                        indicator="dot"
                                    />}
                                />
                                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                 <Card className="col-span-1 flex flex-col h-full">
                    <CardHeader>
                        <CardTitle>Activity Feed</CardTitle>
                        <CardDescription>A summary of recent orders and payment alerts.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <Tabs defaultValue="recent_orders" className="flex flex-col h-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="recent_orders">
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Recent Orders ({data.recentOrders.length})
                                </TabsTrigger>
                                <TabsTrigger value="overdue">
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Overdue ({overdueAlerts.length})
                                </TabsTrigger>
                                <TabsTrigger value="upcoming">
                                    <Clock className="mr-2 h-4 w-4" />
                                    Upcoming ({upcomingAlerts.length})
                                </TabsTrigger>
                                <TabsTrigger value="low_stock">
                                    <Package className="mr-2 h-4 w-4" />
                                    Low Stock ({lowStockAlerts.length})
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="recent_orders" className="pt-4 flex-1">
                               <RecentOrdersList orders={data.recentOrders} />
                            </TabsContent>
                            <TabsContent value="overdue" className="pt-4 flex-1">
                               <AlertList alerts={overdueAlerts} isOverdue={true} />
                            </TabsContent>
                            <TabsContent value="upcoming" className="pt-4 flex-1">
                                <AlertList alerts={upcomingAlerts} isOverdue={false} />
                            </TabsContent>
                             <TabsContent value="low_stock" className="pt-4 flex-1">
                                <LowStockList alerts={lowStockAlerts} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile Layout: Stacked */}
            <div className="lg:hidden flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                         <CardDescription>Your 5 most recent orders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <RecentOrdersList orders={data.recentOrders} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Payment Alerts</CardTitle>
                        <CardDescription>Manage overdue and upcoming payments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Tabs defaultValue="overdue" className="flex flex-col h-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="overdue">
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Overdue ({overdueAlerts.length})
                                </TabsTrigger>
                                <TabsTrigger value="upcoming">
                                    <Clock className="mr-2 h-4 w-4" />
                                    Upcoming ({upcomingAlerts.length})
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="overdue" className="pt-4 flex-1">
                               <AlertList alerts={overdueAlerts} isOverdue={true} />
                            </TabsContent>
                            <TabsContent value="upcoming" className="pt-4 flex-1">
                                <AlertList alerts={upcomingAlerts} isOverdue={false} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Low Stock Alerts</CardTitle>
                        <CardDescription>Products that need to be reordered soon.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LowStockList alerts={lowStockAlerts} />
                    </CardContent>
                </Card>
                  <Card>
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                         <CardDescription>Monthly revenue summary.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
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
                                <YAxis tickFormatter={(value) => `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol', notation: 'compact' }).format(value as number)}`}/>
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        formatter={(value) => `${formatNumber(value as number)}`}
                                        indicator="dot"
                                    />}
                                />
                                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

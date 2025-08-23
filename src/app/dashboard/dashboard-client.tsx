
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Boxes, CreditCard, IndianRupee, AlertTriangle, Clock } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Order, PaymentAlert } from '@/lib/types';
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


const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);

export function DashboardClient({ data }: { data: any }) {
    const overdueAlerts = data.paymentAlerts.filter((a: PaymentAlert) => a.isOverdue);
    const upcomingAlerts = data.paymentAlerts.filter((a: PaymentAlert) => !a.isOverdue);

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                                        <TableCell className="text-right">
                                            {formatNumber(order.total)}
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
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Payment Alerts
                    </CardTitle>
                    <CardDescription>
                        A summary of overdue and upcoming payments from customers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="overdue">
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
                        <TabsContent value="overdue" className="pt-4">
                           <AlertList alerts={overdueAlerts} isOverdue={true} />
                        </TabsContent>
                        <TabsContent value="upcoming" className="pt-4">
                            <AlertList alerts={upcomingAlerts} isOverdue={false} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

// These icons are not in lucide, so defining a basic version here
const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const CalendarCheck2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m16 20 2 2 4-4" />
    </svg>
);


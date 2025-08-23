
'use client';

import React from 'react';
import type { Customer, Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Home, DollarSign, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN');

function InfoCard({ icon: Icon, label, value, className }: { icon: React.ElementType, label: string, value: React.ReactNode, className?: string }) {
    return (
        <div className={`flex items-start gap-3 rounded-lg bg-muted/50 p-3 ${className}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-base font-semibold">{value}</p>
            </div>
        </div>
    );
}

export function CustomerDetailsClient({ customer, orders }: { customer: Customer, orders: Order[] }) {

    const totalPaid = orders.reduce((sum, order) => {
        const orderPayments = order.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) ?? 0;
        return sum + orderPayments;
    }, 0);
    
    const totalDue = customer.transactionHistory.totalSpent - totalPaid;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/customers">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">{customer.name}</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>Contact and transaction summary.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <InfoCard icon={DollarSign} label="Total Ordered" value={formatNumber(customer.transactionHistory.totalSpent)} />
                        <InfoCard icon={CheckCircle} label="Total Paid" value={formatNumber(totalPaid)} className="text-green-700" />
                        <InfoCard icon={AlertCircle} label="Total Due" value={formatNumber(totalDue)} className={totalDue > 0 ? "text-red-700" : ""} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard icon={Mail} label="Email" value={customer.email} />
                        <InfoCard icon={Phone} label="Phone" value={customer.phone} />
                        <InfoCard icon={Home} label="Address" value={customer.address} />
                     </div>
                     <div className="mt-4 grid grid-cols-1">
                        <InfoCard icon={Calendar} label="Last Purchase" value={formatDate(customer.transactionHistory.lastPurchaseDate)} />
                     </div>
                </CardContent>
            </Card>

            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle>Customer History</CardTitle>
                    <CardDescription>A complete list of all orders placed by {customer.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Paid Amount</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="text-right">Grand Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => {
                                    const orderPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
                                    return (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.id}</TableCell>
                                        <TableCell>{formatDate(order.orderDate)}</TableCell>
                                        <TableCell>
                                            <Badge variant={order.status === 'Fulfilled' ? 'default' : order.status === 'Pending' ? 'secondary' : 'destructive'} className="capitalize">
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">{formatNumber(orderPaid)}</TableCell>
                                        <TableCell className="text-right font-medium text-red-600">{formatNumber(order.balanceDue ?? 0)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(order.grandTotal)}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

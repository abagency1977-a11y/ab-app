
'use client';

import React, { useState, useMemo } from 'react';
import type { Order } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatNumber = (value: number) => {
    if (isNaN(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const InvoiceTable = ({ invoices }: { invoices: Order[] }) => (
    <div className="rounded-lg border shadow-sm">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Term</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id.replace('ORD', 'INV')}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{new Date(invoice.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                            <Badge variant={invoice.status === 'Fulfilled' ? 'default' : invoice.status === 'Pending' ? 'secondary' : 'destructive'} className="capitalize">{invoice.status}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={invoice.paymentTerm === 'Full Payment' ? 'default' : 'secondary'} className="capitalize">{invoice.paymentTerm}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            ₹{formatNumber(invoice.grandTotal)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);


export function InvoicesClient({ orders }: { orders: Order[] }) {
    const [allInvoices] = useState<Order[]>(orders);

    const { fullPaidInvoices, creditInvoices } = useMemo(() => {
        const fullPaid = allInvoices.filter(order => order.paymentTerm === 'Full Payment');
        const credit = allInvoices.filter(order => order.paymentTerm === 'Credit');
        return { fullPaidInvoices: fullPaid, creditInvoices: credit };
    }, [allInvoices]);

    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold">Invoices</h1>
            <Tabs defaultValue="full-paid">
                <TabsList>
                    <TabsTrigger value="full-paid">Full Paid Invoices</TabsTrigger>
                    <TabsTrigger value="credit">Credit Invoices</TabsTrigger>
                </TabsList>
                <TabsContent value="full-paid">
                    <InvoiceTable invoices={fullPaidInvoices} />
                </TabsContent>
                <TabsContent value="credit">
                    <InvoiceTable invoices={creditInvoices} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

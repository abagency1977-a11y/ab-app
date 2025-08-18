'use client';

import React, { useState, useMemo } from 'react';
import type { Order, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Receipt, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateInvoice } from '@/ai/flows/generate-invoice';
import { generateReceipt } from '@/ai/flows/generate-receipt';
import { Textarea } from '@/components/ui/textarea';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export function OrdersClient({ orders, customers }: { orders: Order[], customers: Customer[] }) {
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const filteredOrders = useMemo(() => {
        if (statusFilter === 'All') return orders;
        return orders.filter(order => order.status === statusFilter);
    }, [orders, statusFilter]);

    const handleGenerateInvoice = async (order: Order) => {
        const customer = customers.find(c => c.id === order.customerId);
        if (!customer) return;

        setIsLoading(true);
        setModalTitle(`Generating Invoice for ${order.id}`);
        setModalContent('');
        setIsModalOpen(true);

        const orderData = order.items.map(item => `${item.quantity}x ${item.productName} @ ${formatCurrency(item.price)}`).join('\n');
        
        try {
            const result = await generateInvoice({
                orderData,
                customerName: customer.name,
                customerAddress: customer.address,
                invoiceNumber: order.id,
                invoiceDate: new Date().toISOString().split('T')[0],
                companyName: 'AB Agency',
                companyAddress: '456 Corporate Lane, Business City, 98765',
            });
            setModalTitle(`Invoice for ${order.id}`);
            setModalContent(result.invoice);
        } catch (e) {
            setModalContent('Failed to generate invoice.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateReceipt = async (order: Order) => {
        const customer = customers.find(c => c.id === order.customerId);
        if (!customer) return;

        setIsLoading(true);
        setModalTitle(`Generating Receipt for ${order.id}`);
        setModalContent('');
        setIsModalOpen(true);

        try {
            const result = await generateReceipt({
                customerName: customer.name,
                items: order.items.map(i => ({ name: i.productName, quantity: i.quantity, price: i.price })),
                totalAmount: order.total,
                date: new Date().toISOString().split('T')[0],
                transactionId: `TRANS-${order.id}`,
            });
            setModalTitle(`Receipt for ${order.id}`);
            setModalContent(result.receipt);
        } catch (e) {
            setModalContent('Failed to generate receipt.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Orders</h1>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                    <TabsTrigger value="All">All</TabsTrigger>
                    <TabsTrigger value="Pending">Pending</TabsTrigger>
                    <TabsTrigger value="Fulfilled">Fulfilled</TabsTrigger>
                    <TabsTrigger value="Canceled">Canceled</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id}</TableCell>
                                <TableCell>{order.customerName}</TableCell>
                                <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant={order.status === 'Fulfilled' ? 'default' : order.status === 'Pending' ? 'secondary' : 'destructive'} className="capitalize">{order.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleGenerateInvoice(order)}>
                                                <FileText className="mr-2 h-4 w-4" /> Generate Invoice
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleGenerateReceipt(order)} disabled={order.status !== 'Fulfilled'}>
                                                <Receipt className="mr-2 h-4 w-4" /> Generate Receipt
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{modalTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <Textarea readOnly value={modalContent} className="h-96 w-full font-mono text-sm" />
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => navigator.clipboard.writeText(modalContent)} disabled={isLoading}>Copy</Button>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

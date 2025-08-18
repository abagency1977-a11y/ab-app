'use client';

import React, { useState, useMemo } from 'react';
import type { Order, Customer, Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Receipt, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateInvoice } from '@/ai/flows/generate-invoice';
import { generateReceipt } from '@/ai/flows/generate-receipt';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getProducts } from '@/lib/data';

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value);

export function OrdersClient({ orders: initialOrders, customers }: { orders: Order[], customers: Customer[] }) {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [products, setProducts] = useState<Product[]>([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        getProducts().then(setProducts);
    }, []);

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

        const orderData = order.items.map(item => `${item.quantity}x ${item.productName} @ ₹${formatNumber(item.price)}`).join('\n');
        
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
    };

    const handleAddOrder = (newOrder: Order) => {
        setOrders(prev => [newOrder, ...prev]);
        toast({
            title: "Order Placed",
            description: `Order ${newOrder.id} has been successfully created.`,
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Orders</h1>
                 <Button onClick={() => setIsAddOrderOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Place Order
                </Button>
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
                                <TableCell className="text-right">₹{formatNumber(order.total)}</TableCell>
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

            <AddOrderDialog
                isOpen={isAddOrderOpen}
                onOpenChange={setIsAddOrderOpen}
                customers={customers}
                products={products}
                onOrderAdded={handleAddOrder}
                orderCount={orders.length}
            />
        </div>
    );
}

function AddOrderDialog({ isOpen, onOpenChange, customers, products, onOrderAdded, orderCount }: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    customers: Customer[],
    products: Product[],
    onOrderAdded: (order: Order) => void,
    orderCount: number,
}) {
    const [customerId, setCustomerId] = useState<string>('');
    const [items, setItems] = useState<{ productId: string, quantity: number }[]>([]);

    const handleAddItem = () => {
        setItems([...items, { productId: '', quantity: 1 }]);
    };

    const handleItemChange = (index: number, field: 'productId' | 'quantity', value: string) => {
        const newItems = [...items];
        if (field === 'quantity') {
            newItems[index][field] = parseInt(value, 10) || 1;
        } else {
            newItems[index][field] = value;
        }
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!customerId || items.length === 0 || items.some(i => !i.productId)) {
            alert('Please select a customer and add at least one valid item.');
            return;
        }
        
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        const orderItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                productId: item.productId,
                productName: product?.name || 'Unknown',
                quantity: item.quantity,
                price: product?.price || 0,
            };
        });

        const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const newOrder: Order = {
            id: `ORD-${String(orderCount + 1).padStart(3, '0')}`,
            customerId,
            customerName: customer.name,
            orderDate: new Date().toISOString().split('T')[0],
            status: 'Pending',
            items: orderItems,
            total,
        };

        onOrderAdded(newOrder);
        onOpenChange(false);
        // Reset form
        setCustomerId('');
        setItems([]);
    };

    const total = useMemo(() => {
        return items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + (product?.price || 0) * item.quantity;
        }, 0);
    }, [items, products]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Place New Order</DialogTitle>
                    <DialogDescription>Select a customer and add products to the order.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer">Customer</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger id="customer">
                                    <SelectValue placeholder="Select a customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(customer => (
                                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Order Items</Label>
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                {items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Select value={item.productId} onValueChange={(value) => handleItemChange(index, 'productId', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map(product => (
                                                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-24"
                                        />
                                        <Button variant="outline" size="icon" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </div>
                        <div className="text-right text-xl font-bold">
                            Total: ₹{formatNumber(total)}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Place Order</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

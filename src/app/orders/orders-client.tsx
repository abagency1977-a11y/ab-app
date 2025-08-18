

'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Order, Customer, Product, PaymentTerm, PaymentMode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Receipt, Loader2, PlusCircle, Trash2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateReceipt } from '@/ai/flows/generate-receipt';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getProducts } from '@/lib/data';
import { Rupee } from '@/components/icons';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceTemplate } from '@/components/invoice-template';
import { AbLogo } from '@/components/ab-logo';


const formatNumber = (value: number) => {
    if (isNaN(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};


export function OrdersClient({ orders: initialOrders, customers: initialCustomers }: { orders: Order[], customers: Customer[] }) {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [products, setProducts] = useState<Product[]>([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptContent, setReceiptContent] = useState('');
    const [receiptTitle, setReceiptTitle] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
    const { toast } = useToast();
    const invoiceRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        getProducts().then(setProducts);
    }, []);

    const filteredOrders = useMemo(() => {
        if (statusFilter === 'All') return orders;
        return orders.filter(order => order.status === statusFilter);
    }, [orders, statusFilter]);

    const handleGenerateInvoice = (order: Order) => {
        setSelectedOrder(order);
        setIsInvoiceModalOpen(true);
    };
    
    const handleGenerateReceipt = async (order: Order) => {
        const customer = customers.find(c => c.id === order.customerId);
        if (!customer) return;

        setIsLoading(true);
        setReceiptTitle(`Generating Receipt for ${order.id}`);
        setReceiptContent('');
        setIsReceiptModalOpen(true);

        try {
            const result = await generateReceipt({
                customerName: customer.name,
                items: order.items.map(i => ({ name: i.productName, quantity: i.quantity, price: i.price })),
                totalAmount: order.grandTotal,
                date: new Date().toISOString().split('T')[0],
                transactionId: `TRANS-${order.id}`,
            });
            setReceiptTitle(`Receipt for ${order.id}`);
            setReceiptContent(result.receipt);
        } catch (e) {
            setReceiptContent('Failed to generate receipt.');
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

    const handleAddCustomer = (newCustomer: Customer) => {
        setCustomers(prev => [...prev, newCustomer]);
        toast({
            title: "Customer Added",
            description: `${newCustomer.name} has been successfully added.`,
        });
    };

    const handleDownloadPdf = async () => {
        const input = invoiceRef.current;
        if (!input || !selectedOrder) return;

        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }

        pdf.save(`Invoice_${selectedOrder.id}.pdf`);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Orders</h1>
                 <Button onClick={() => setIsAddOrderOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Place Order
                </Button>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} defaultValue="All">
                <TabsList>
                    <TabsTrigger value="All">All</TabsTrigger>
                    <TabsTrigger value="Pending">Pending</TabsTrigger>
                    <TabsTrigger value="Fulfilled">Fulfilled</TabsTrigger>
                    <TabsTrigger value="Canceled">Canceled</TabsTrigger>
                </TabsList>
                <TabsContent value={statusFilter}>
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
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end">
                                              <Rupee className="inline-block h-4 w-4 mr-1" />
                                              {formatNumber(order.grandTotal)}
                                            </div>
                                        </TableCell>
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
                </TabsContent>
                 <TabsContent value="Pending">
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
                                {filteredOrders.filter(o => o.status === 'Pending').map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.id}</TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant='secondary' className="capitalize">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end">
                                              <Rupee className="inline-block h-4 w-4 mr-1" />
                                              {formatNumber(order.grandTotal)}
                                            </div>
                                        </TableCell>
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
                </TabsContent>
                 <TabsContent value="Fulfilled">
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
                                {filteredOrders.filter(o => o.status === 'Fulfilled').map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.id}</TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant='default' className="capitalize">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end">
                                              <Rupee className="inline-block h-4 w-4 mr-1" />
                                              {formatNumber(order.grandTotal)}
                                            </div>
                                        </TableCell>
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
                </TabsContent>
                 <TabsContent value="Canceled">
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
                                {filteredOrders.filter(o => o.status === 'Canceled').map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.id}</TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant='destructive' className="capitalize">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end">
                                              <Rupee className="inline-block h-4 w-4 mr-1" />
                                              {formatNumber(order.grandTotal)}
                                            </div>
                                        </TableCell>
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
                </TabsContent>
            </Tabs>
            
             <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
                <DialogContent className="max-w-4xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Invoice for {selectedOrder?.id}</DialogTitle>
                    </DialogHeader>
                     <ScrollArea className="h-full">
                        <div className="p-4 bg-gray-50">
                            {selectedOrder && customers && (
                               <InvoiceTemplate 
                                    ref={invoiceRef}
                                    order={selectedOrder} 
                                    customer={customers.find(c => c.id === selectedOrder.customerId)}
                                />
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                        <Button variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{receiptTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="p-4 bg-white text-black font-mono text-sm">
                                <pre className="whitespace-pre-wrap">{receiptContent}</pre>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => navigator.clipboard.writeText(receiptContent)} disabled={isLoading}>Copy Text</Button>
                        <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AddOrderDialog
                isOpen={isAddOrderOpen}
                onOpenChange={setIsAddOrderOpen}
                customers={customers}
                products={products}
                onOrderAdded={handleAddOrder}
                onCustomerAdded={handleAddCustomer}
                orderCount={orders.length}
                customerCount={customers.length}
            />
        </div>
    );
}

const initialItemState = { productId: '', quantity: '', price: '', gst: '', stock: 0 };
type OrderItemState = { productId: string, quantity: string, price: string, gst: string, stock: number };

function AddOrderDialog({ isOpen, onOpenChange, customers, products, onOrderAdded, onCustomerAdded, orderCount, customerCount }: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    customers: Customer[],
    products: Product[],
    onOrderAdded: (order: Order) => void,
    onCustomerAdded: (customer: Customer) => void,
    orderCount: number,
    customerCount: number,
}) {
    const [customerId, setCustomerId] = useState<string>('');
    const [items, setItems] = useState<OrderItemState[]>([]);
    const [currentItem, setCurrentItem] = useState<OrderItemState>(initialItemState);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('Full Payment');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
    const [paymentRemarks, setPaymentRemarks] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [isGstInvoice, setIsGstInvoice] = useState(true);
    const [enableDiscount, setEnableDiscount] = useState(false);
    const [discount, setDiscount] = useState(0);

    const { toast } = useToast();

    const resetForm = useCallback(() => {
        setCustomerId('');
        setItems([]);
        setCurrentItem(initialItemState);
        setEditingItemIndex(null);
        setPaymentTerm('Full Payment');
        setPaymentMode('Cash');
        setPaymentRemarks('');
        setDueDate('');
        setDeliveryDate('');
        setDeliveryAddress('');
        setIsGstInvoice(true);
        setEnableDiscount(false);
        setDiscount(0);
        onOpenChange(false);
    }, [onOpenChange]);

    const handleProductSelect = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setCurrentItem({
                productId: product.id,
                quantity: '',
                price: String(product.price),
                gst: String(product.gst),
                stock: product.stock
            });
        }
    };
    
    const handleAddItem = () => {
        if (!currentItem.productId) {
            toast({ title: 'Error', description: 'Please select an item.', variant: 'destructive' });
            return;
        }

        const quantity = parseInt(currentItem.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            toast({ title: 'Error', description: 'Please enter a valid quantity.', variant: 'destructive' });
            return;
        }

        if (quantity > currentItem.stock) {
            toast({ title: 'Stock Error', description: `Not enough stock for ${products.find(p=>p.id===currentItem.productId)?.name}. Available: ${currentItem.stock}`, variant: 'destructive' });
            return;
        }
        setItems([...items, currentItem]);
        setCurrentItem(initialItemState);
    };
    
    const handleUpdateItem = () => {
        if (editingItemIndex === null) return;
        const quantity = parseInt(currentItem.quantity);
         if (isNaN(quantity) || quantity <= 0) {
            toast({ title: 'Error', description: 'Please enter a valid quantity.', variant: 'destructive' });
            return;
        }
        if (quantity > currentItem.stock) {
            toast({ title: 'Stock Error', description: `Not enough stock for ${products.find(p=>p.id===currentItem.productId)?.name}. Available: ${currentItem.stock}`, variant: 'destructive' });
            return;
        }
        const newItems = [...items];
        newItems[editingItemIndex] = currentItem;
        setItems(newItems);
        setCurrentItem(initialItemState);
        setEditingItemIndex(null);
    };

    const handleEditItemClick = (index: number) => {
        setEditingItemIndex(index);
        const itemToEdit = items[index];
        const product = products.find(p => p.id === itemToEdit.productId);
        setCurrentItem({ ...itemToEdit, stock: product?.stock || 0 });
    };
    
    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleAddCustomerSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newCustomer: Customer = {
            id: `CUST-${String(customerCount + 1).padStart(3, '0')}`,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            transactionHistory: { totalSpent: 0, lastPurchaseDate: new Date().toISOString().split('T')[0] },
        };
        onCustomerAdded(newCustomer);
        setIsAddCustomerOpen(false);
        setCustomerId(newCustomer.id);
    };

    const { subTotal, totalGst, total } = useMemo(() => {
        const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);
        
        let totalGst = 0;
        if (isGstInvoice) {
            totalGst = items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0) * ((parseFloat(item.gst) || 0) / 100)), 0);
        }
        
        const total = subTotal + totalGst;
        return { subTotal, totalGst, total };
    }, [items, isGstInvoice]);

    const grandTotal = useMemo(() => total - discount, [total, discount]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!customerId || items.length === 0) {
            toast({
                title: "Validation Error",
                description: 'Please select a customer and add at least one item.',
                variant: 'destructive'
            });
            return;
        }
        
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        const newOrder: Order = {
            id: `ORD-${String(orderCount + 1).padStart(3, '0')}`,
            customerId,
            customerName: customer.name,
            orderDate: new Date().toISOString().split('T')[0],
            status: 'Pending',
            items: items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    productId: item.productId,
                    productName: product?.name || 'Unknown',
                    quantity: parseInt(item.quantity) || 0,
                    price: parseFloat(item.price) || 0,
                    gst: parseFloat(item.gst) || 0,
                };
            }),
            total,
            discount,
            grandTotal,
            paymentTerm,
            paymentMode: paymentTerm === 'Full Payment' ? paymentMode : undefined,
            paymentRemarks: paymentTerm === 'Full Payment' ? paymentRemarks : undefined,
            dueDate: paymentTerm === 'Credit' ? dueDate : undefined,
            deliveryDate,
            deliveryAddress: deliveryAddress || customer.address,
            isGstInvoice,
        };
        onOrderAdded(newOrder);
        resetForm();
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if(!open) resetForm(); else onOpenChange(open);}}>
                <DialogContent className="max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>Place New Order</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <ScrollArea className="h-[70vh]">
                            <div className="space-y-4 p-4">

                                {/* Order Details */}
                                <Card>
                                    <CardContent className="p-4 space-y-4">
                                        <DialogTitle className="text-lg">Order Details</DialogTitle>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                                <Label htmlFor="customer">Customer Name</Label>
                                                <div className="flex gap-2">
                                                    <Select value={customerId} onValueChange={setCustomerId}>
                                                        <SelectTrigger id="customer"><SelectValue placeholder="Select a customer" /></SelectTrigger>
                                                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <Button type="button" variant="outline" onClick={() => setIsAddCustomerOpen(true)}>Add New</Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                                            <div className="space-y-2 col-span-2">
                                                <Label>Item Name</Label>
                                                <Select value={currentItem.productId} onValueChange={handleProductSelect}>
                                                    <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
                                                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Stock Left</Label>
                                                <Input value={currentItem.stock} readOnly disabled />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Quantity</Label>
                                                <Input type="number" placeholder="" value={currentItem.quantity} onChange={e => setCurrentItem(s => ({ ...s, quantity: e.target.value }))} min="1" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Rate</Label>
                                                <Input type="number" value={currentItem.price} onChange={e => setCurrentItem(s => ({ ...s, price: e.target.value }))} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>GST %</Label>
                                                <Input type="number" value={currentItem.gst} onChange={e => setCurrentItem(s => ({ ...s, gst: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            {editingItemIndex !== null ? (
                                                <Button type="button" onClick={handleUpdateItem}>Update Item</Button>
                                            ) : (
                                                <Button type="button" onClick={handleAddItem}>Add Item</Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Items Table */}
                                <Card>
                                    <CardContent className="p-4">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead>GST</TableHead><TableHead>Total</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {items.map((item, index) => {
                                                    const product = products.find(p => p.id === item.productId);
                                                    const price = parseFloat(item.price) || 0;
                                                    const quantity = parseInt(item.quantity) || 0;
                                                    const gst = parseFloat(item.gst) || 0;
                                                    const itemTotal = isGstInvoice
                                                        ? price * quantity * (1 + gst / 100)
                                                        : price * quantity;
                                                    return (
                                                        <TableRow key={index}>
                                                            <TableCell>{product?.name}</TableCell>
                                                            <TableCell>{item.quantity}</TableCell>
                                                            <TableCell>{formatNumber(price)}</TableCell>
                                                            <TableCell>{isGstInvoice ? `${item.gst}%` : 'N/A'}</TableCell>
                                                            <TableCell>{formatNumber(itemTotal)}</TableCell>
                                                            <TableCell className="space-x-2">
                                                                <Button type="button" size="sm" variant="outline" onClick={() => handleEditItemClick(index)}>Edit</Button>
                                                                <Button type="button" size="sm" variant="destructive" onClick={() => handleRemoveItem(index)}>Delete</Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Payment Details */}
                                    <Card>
                                      <CardContent className="p-4 space-y-4">
                                          <DialogTitle className="text-lg">Payment Details</DialogTitle>
                                          <div className="space-y-2">
                                              <Label>Payment Term</Label>
                                              <RadioGroup value={paymentTerm} onValueChange={(v) => setPaymentTerm(v as PaymentTerm)} className="flex gap-4">
                                                  <div className="flex items-center space-x-2"><RadioGroupItem value="Full Payment" id="full_payment" /><Label htmlFor="full_payment">Full Payment</Label></div>
                                                  <div className="flex items-center space-x-2"><RadioGroupItem value="Credit" id="credit" /><Label htmlFor="credit">Credit</Label></div>
                                              </RadioGroup>
                                          </div>
                                          {paymentTerm === 'Full Payment' && (
                                            <>
                                              <div className="space-y-2">
                                                  <Label>Payment Mode</Label>
                                                  <Select value={paymentMode} onValueChange={v => setPaymentMode(v as PaymentMode)}>
                                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                                      <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Online Transfer">Online Transfer</SelectItem></SelectContent>
                                                  </Select>
                                              </div>
                                              {(paymentMode === 'Card' || paymentMode === 'Cheque') && (
                                                  <div className="space-y-2">
                                                      <Label>Payment Remarks</Label>
                                                      <Input value={paymentRemarks} onChange={e => setPaymentRemarks(e.target.value)} placeholder="Enter card/cheque details"/>
                                                  </div>
                                              )}
                                            </>
                                          )}
                                          {paymentTerm === 'Credit' && (
                                            <div className="space-y-2">
                                                <Label>Due Date</Label>
                                                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                            </div>
                                          )}
                                      </CardContent>
                                    </Card>

                                    {/* Summary & Delivery */}
                                    <div className="space-y-4">
                                        <Card><CardContent className="p-4 space-y-2">
                                            <DialogTitle className="text-lg">Order Summary</DialogTitle>
                                            <div className="flex justify-between"><span>Subtotal:</span> <span className="font-semibold flex items-center"><Rupee className="inline-block h-4 w-4 mr-1" />{formatNumber(subTotal)}</span></div>
                                            {isGstInvoice && <div className="flex justify-between"><span>Total GST:</span> <span className="font-semibold flex items-center"><Rupee className="inline-block h-4 w-4 mr-1" />{formatNumber(totalGst)}</span></div>}
                                            <Separator />
                                            <div className="flex justify-between text-lg">
                                                <span className="font-bold">Grand Total Value:</span>
                                                <span className="font-bold text-primary flex items-center"><Rupee className="inline-block h-5 w-5 mr-1" />{formatNumber(grandTotal)}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 pt-2">
                                                <Checkbox id="enable_discount" checked={enableDiscount} onCheckedChange={c => setEnableDiscount(c as boolean)} />
                                                <Label htmlFor="enable_discount" className="flex-1">Enable Discount</Label>
                                                <Input type="number" placeholder="0.00" className="w-24" value={String(discount)} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} disabled={!enableDiscount} />
                                            </div>
                                            <div className="flex justify-between"><span>Discount Applied:</span> <span className="font-semibold flex items-center"><Rupee className="inline-block h-4 w-4 mr-1" />{formatNumber(discount)}</span></div>
                                             <div className="flex items-center space-x-2 pt-2">
                                                <Checkbox id="is_gst_invoice" checked={isGstInvoice} onCheckedChange={c => setIsGstInvoice(c as boolean)} />
                                                <Label htmlFor="is_gst_invoice">Generate GST Invoice?</Label>
                                            </div>
                                        </CardContent></Card>
                                        <Card><CardContent className="p-4 space-y-4">
                                            <DialogTitle className="text-lg">Delivery Details</DialogTitle>
                                            <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
                                            <div className="space-y-2"><Label>Delivery Address</Label><Textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Leave blank to use customer's default address" /></div>
                                        </CardContent></Card>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="p-4 border-t">
                            <Button type="button" variant="outline" onClick={() => resetForm()}>Cancel</Button>
                            <Button type="submit">Submit Order</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add New Customer</DialogTitle><DialogDescription>Fill in the details below to add a new customer.</DialogDescription></DialogHeader>
                    <form onSubmit={handleAddCustomerSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Name</Label><Input id="name" name="name" className="col-span-3" required /></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" name="email" type="email" className="col-span-3" required /></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="phone" className="text-right">Phone</Label><Input id="phone" name="phone" className="col-span-3" /></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="address" className="text-right">Address</Label><Input id="address" name="address" className="col-span-3" /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddCustomerOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Customer</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}


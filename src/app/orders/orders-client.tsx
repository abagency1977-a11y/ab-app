
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Order, Customer, Product, PaymentTerm, PaymentMode, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Receipt, Loader2, PlusCircle, Trash2, Download, Edit, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addOrder, addCustomer, deleteOrder as deleteOrderFromDB, getCustomerBalance, getProducts, updateOrder, getAllData } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { startOfWeek, startOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox } from '@/components/ui/combobox';


const formatNumberForDisplay = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);
};

export function OrdersClient({ orders: initialOrders, customers: initialCustomers, products: initialProducts }: { orders: Order[], customers: Customer[], products: Product[] }) {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('All');
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) {
            setLogoUrl(savedLogo);
        }
    }, []);

    const openOrderDialog = async () => {
        setIsLoading(true);
        try {
            const freshProducts = await getProducts();
            setProducts(freshProducts);
            setIsAddOrderOpen(true);
        } catch(e) {
            toast({ title: 'Error', description: 'Could not fetch latest product data.', variant: 'destructive'});
        } finally {
            setIsLoading(false);
        }
    }
    
    const openEditDialog = async (order: Order) => {
        setIsLoading(true);
        try {
            const freshProducts = await getProducts();
            setProducts(freshProducts);
            setOrderToEdit(order);
        } catch(e) {
            toast({ title: 'Error', description: 'Could not fetch latest product data.', variant: 'destructive'});
        } finally {
            setIsLoading(false);
        }
    }


    const filteredOrders = useMemo(() => {
        const now = new Date();
        let filtered = orders.filter(order =>
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (dateFilter !== 'All') {
            let interval: Interval;
            if (dateFilter === 'This Week') {
                interval = { start: startOfWeek(now), end: now };
            } else if (dateFilter === 'This Month') {
                interval = { start: startOfMonth(now), end: now };
            } else if (dateFilter === 'Last Month') {
                const startOfThisMonth = startOfMonth(now);
                const startOfLastMonth = subMonths(startOfThisMonth, 1);
                interval = { start: startOfLastMonth, end: startOfThisMonth };
            }
             filtered = filtered.filter(order => {
                const orderDate = new Date(order.orderDate);
                return isWithinInterval(orderDate, interval);
            });
        }
        
        return filtered.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [orders, searchQuery, dateFilter]);

    const handleGenerateInvoice = (order: Order) => {
        setOrderToPrint(order);
    };
    
    useEffect(() => {
        if (orderToPrint) {
            handlePrint();
        }
    }, [orderToPrint]);

    const handleWhatsAppShare = (order: Order) => {
        const customer = customers.find(c => c.id === order.customerId);
        if (!customer || !customer.phone) {
            toast({ title: 'Error', description: "Customer's phone number is not available.", variant: 'destructive'});
            return;
        }

        const message = `Hello ${customer.name}, here is your invoice ${order.id.replace('ORD', 'INV')}. Total amount: ${formatNumberForDisplay(order.grandTotal)}. Thank you for your business!`;
        const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
        toast({ title: 'Success', description: 'WhatsApp chat opened. Please attach the downloaded invoice.' });
    };

    const handlePrint = async () => {
        if (!orderToPrint) return;

        const customer = customers.find(c => c.id === orderToPrint.customerId);
        if(!customer) return;

        setIsLoading(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 14;

            // --- Utility for currency formatting ---
            const formatNumber = (value: number | undefined) => {
                if (value === undefined || isNaN(value)) return `INR 0.00`;
                return `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
            };

            // --- Header ---
            if (logoUrl) {
                const logoWidth = 25; 
                const logoHeight = 20;
                doc.addImage(logoUrl, 'PNG', pageWidth / 2 - (logoWidth/2), 15, logoWidth, logoHeight);
            }
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('No.1, Ayyanchery main road, Urapakkam, Chennai - 603210', pageWidth / 2, 40, { align: 'center' });
            doc.text('Email: abagency1977@gmail.com | MOB: 95511 95505 / 95001 82975', pageWidth / 2, 44, { align: 'center' });
            
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, 48, pageWidth - margin, 48);
            // --- End Header ---

            // --- Customer and Invoice Details ---
            let yPos = 58;
            const rightColX = pageWidth - margin;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Billed To:', margin, yPos);
            doc.setFont('helvetica', 'normal');
            yPos += 5;
            doc.text(customer.name, margin, yPos);
            yPos += 5;
            const addressLines = doc.splitTextToSize(customer.address || 'No address provided', 80);
            doc.text(addressLines, margin, yPos);
            yPos += (addressLines.length * 5) + 5; 
            doc.text(customer.phone, margin, yPos);
            
            let rightYPos = 58;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('GSTIN: 33DMLPA8598D1ZU', rightColX, rightYPos, { align: 'right' });
            rightYPos += 8;
            
            doc.setFontSize(11);
            if (orderToPrint.paymentTerm === 'Credit') {
                doc.setTextColor(255, 0, 0); // Red for credit
                doc.text('CREDIT INVOICE', rightColX, rightYPos, { align: 'right' });
            } else {
                doc.setTextColor(0, 128, 0); // Green for full payment
                doc.text('INVOICE', rightColX, rightYPos, { align: 'right' });
            }
            doc.setTextColor(0, 0, 0);
            rightYPos += 10;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Invoice No: ${orderToPrint.id.replace('ORD', 'INV')}`, rightColX, rightYPos, { align: 'right' });
            rightYPos += 5;
            doc.text(`Date: ${new Date(orderToPrint.orderDate).toLocaleDateString('en-IN')}`, rightColX, rightYPos, { align: 'right' });
            rightYPos += 5;
            
            if (orderToPrint.dueDate) {
                doc.text(`Due Date: ${new Date(orderToPrint.dueDate).toLocaleDateString('en-IN')}`, rightColX, rightYPos, { align: 'right' });
                rightYPos += 5;
            }
             if (orderToPrint.deliveryDate) {
                doc.text(`Delivery Date: ${new Date(orderToPrint.deliveryDate).toLocaleDateString('en-IN')}`, rightColX, rightYPos, { align: 'right' });
            }
            // --- End Customer and Invoice Details ---

            // --- Items Table ---
            const tableStartY = Math.max(yPos, rightYPos) + 10;
            const tableBody = orderToPrint.items.map(item => {
                 const totalValue = orderToPrint.isGstInvoice
                    ? item.price * item.quantity * (1 + item.gst / 100)
                    : item.price * item.quantity;
                return [
                    item.productName,
                    item.quantity,
                    formatNumber(item.price),
                    orderToPrint.isGstInvoice ? `${item.gst}%` : 'N/A',
                    formatNumber(totalValue)
                ];
            });

            (doc as any).autoTable({
                startY: tableStartY,
                head: [['Item Description', 'Qty', 'Rate', 'GST', 'Total']],
                body: tableBody,
                theme: 'grid',
                headStyles: {
                    fillColor: [222, 247, 236], // Light Green
                    textColor: [3, 7, 6], // Dark text
                    fontStyle: 'bold',
                },
                styles: {
                    cellPadding: 2,
                    fontSize: 9,
                },
                columnStyles: {
                    0: { cellWidth: 70 }, // Description
                    1: { halign: 'center' }, // Qty
                    2: { halign: 'right' }, // Rate
                    3: { halign: 'center' }, // GST
                    4: { halign: 'right' }, // Total
                }
            });
            // --- End Items Table ---

            // --- Totals Section ---
            let finalY = (doc as any).previousAutoTable.finalY + 10;
            const totalsRightColX = pageWidth - margin;
            const totalsLeftColX = totalsRightColX - 50; 
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            const addTotalRow = (label: string, value: number) => {
                doc.text(label, totalsLeftColX, finalY, { align: 'right' });
                doc.text(formatNumber(value), totalsRightColX, finalY, { align: 'right' });
                finalY += 6;
            };

            addTotalRow("Subtotal:", orderToPrint.total);
            if(orderToPrint.deliveryFees > 0) addTotalRow("Delivery Fees:", orderToPrint.deliveryFees);
            if(orderToPrint.discount > 0) addTotalRow("Discount:", -orderToPrint.discount);
            if(orderToPrint.previousBalance > 0) addTotalRow("Previous Balance:", orderToPrint.previousBalance);

            // Grand Total with colored background
            finalY += 12; // 2 lines lower
            
            const grandTotalText = `Grand Total: ${formatNumber(orderToPrint.grandTotal)}`;
            doc.setFont('helvetica', 'bold');
            
            const isCredit = orderToPrint.paymentTerm === 'Credit' && (orderToPrint.balanceDue ?? 0) > 0;
            const boxColor = isCredit ? [255, 235, 238] : [222, 247, 236]; // Light Red or Light Green
            const textColor = isCredit ? [220, 38, 38] : [22, 101, 52]; // Red-600 or Green-800
            
            doc.setFillColor(...boxColor);
            doc.setDrawColor(...boxColor);
            doc.roundedRect(margin, finalY - 5, pageWidth - (margin * 2), 10, 3, 3, 'FD');
            
            doc.setTextColor(...textColor);
            doc.text(grandTotalText, pageWidth/2, finalY, { align: 'center' });
            
            // --- End Totals Section ---
            doc.setTextColor(0,0,0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            
            const footerY = doc.internal.pageSize.getHeight() - 15;
            doc.text('Thank you for your business!', pageWidth/2, footerY, { align: 'center'});
            doc.text('This is a computer-generated invoice and does not require a signature.', pageWidth/2, footerY + 4, { align: 'center'});


            doc.save(`invoice-${orderToPrint.id.replace('ORD','INV')}.pdf`);
            toast({ title: 'Success', description: 'Invoice PDF has been downloaded.' });
            
        } catch (error) {
            console.error('Failed to generate invoice:', error);
            toast({ title: 'Error', description: 'Failed to generate invoice PDF.', variant: 'destructive'});
        } finally {
            setIsLoading(false);
            setOrderToPrint(null);
        }
    };

    const refreshData = async () => {
        const { orders: refreshedOrders, customers: refreshedCustomers } = await getAllData();
        setOrders(refreshedOrders);
        setCustomers(refreshedCustomers);
    }

    const handleAddOrder = async (newOrderData: Omit<Order, 'id' | 'customerName'>) => {
       try {
           const newOrder = await addOrder(newOrderData);
           await refreshData();
           toast({
               title: "Order Placed",
               description: `Order ${newOrder.id} has been successfully created.`,
           });
           return newOrder;
       } catch (e: any) {
           console.error("Error details:", e);
           toast({
              title: "Error Placing Order",
              description: e.message || "Failed to save the new order.",
              variant: "destructive"
          });
          throw e; // re-throw to be caught in the dialog
       }
    };

    const handleUpdateOrder = async (updatedOrderData: Order) => {
       try {
           await updateOrder(updatedOrderData);
           await refreshData();
           toast({
               title: "Order Updated",
               description: `Order ${updatedOrderData.id} has been successfully updated.`,
           });
       } catch (e: any) {
           console.error("Error details:", e);
           toast({
              title: "Error Updating Order",
              description: e.message || "Failed to save the order changes.",
              variant: "destructive"
          });
          throw e; // re-throw to be caught in the dialog
       }
    };

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            await deleteOrderFromDB(orderToDelete);
            await refreshData();
            toast({
                title: "Order Deleted",
                description: `Order ${orderToDelete.id} has been successfully deleted.`
            });
        } catch (error: any) {
             toast({
                title: "Error Deleting Order",
                description: error.message || "Could not delete the order.",
                variant: "destructive"
            });
        } finally {
            setOrderToDelete(null);
        }
    }

    const handleAddCustomer = async (newCustomerData: Omit<Customer, 'id' | 'transactionHistory' | 'orders'>) => {
        try {
            const newCustomerWithHistory = await addCustomer(newCustomerData);
            const newCustomer: Customer = {
                ...newCustomerWithHistory,
                orders: []
            };
            setCustomers(prevCustomers => [...prevCustomers, newCustomer]);
            toast({
                title: "Customer Added",
                description: `${newCustomer.name} has been successfully added.`,
            });
            return newCustomer;
        } catch(e) {
             toast({
                title: "Error Adding Customer",
                description: "Failed to save the new customer.",
                variant: "destructive"
            });
            return null;
        }
    };

    if (!isMounted) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="rounded-lg border shadow-sm p-4">
                    <Skeleton className="h-8 w-full mb-4" />
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Orders</h1>
                 <Button onClick={openOrderDialog} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                     Place Order
                </Button>
            </div>
            <div className="flex items-center gap-4">
                <Input 
                    placeholder="Search by Order ID or Customer Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Time</SelectItem>
                        <SelectItem value="This Week">This Week</SelectItem>
                        <SelectItem value="This Month">This Month</SelectItem>
                        <SelectItem value="Last Month">Last Month</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id}</TableCell>
                                <TableCell>{order.customerName}</TableCell>
                                <TableCell>{new Date(order.orderDate).toLocaleDateString('en-IN')}</TableCell>
                                <TableCell>
                                    <Badge variant={order.status === 'Fulfilled' ? 'default' : order.status === 'Pending' ? 'secondary' : order.status === 'Part Payment' ? 'outline' : 'destructive'} className="capitalize">{order.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatNumberForDisplay(order.grandTotal)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditDialog(order)} disabled={order.status === 'Canceled' || isLoading}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleGenerateInvoice(order)} disabled={isLoading || order.status === 'Canceled'}>
                                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :<FileText className="mr-2 h-4 w-4" />}
                                                Generate Invoice
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleWhatsAppShare(order)} disabled={order.status === 'Canceled'}>
                                                <Share2 className="mr-2 h-4 w-4" />
                                                Share via WhatsApp
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setOrderToDelete(order)} className="text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            <AddOrderDialog
                isOpen={isAddOrderOpen || !!orderToEdit}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsAddOrderOpen(false);
                        setOrderToEdit(null);
                    }
                }}
                customers={customers}
                products={products}
                onOrderAdded={handleAddOrder}
                onOrderUpdated={handleUpdateOrder}
                onCustomerAdded={handleAddCustomer}
                existingOrder={orderToEdit}
            />

            <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete order <strong>{orderToDelete?.id}</strong>. 
                        This will also restore the item quantities to the inventory stock and recalculate customer balances.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteOrder}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

const initialItemState = { productId: '', quantity: '', price: '', cost: '', gst: '', stock: 0 };
type OrderItemState = { productId: string, quantity: string, price: string, cost: string, gst: string, stock: number };

function AddOrderDialog({ isOpen, onOpenChange, customers, products, onOrderAdded, onOrderUpdated, onCustomerAdded, existingOrder }: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    customers: Customer[],
    products: Product[],
    onOrderAdded: (order: Omit<Order, 'id' | 'customerName'>) => Promise<Order>,
    onOrderUpdated: (order: Order) => Promise<void>,
    onCustomerAdded: (customer: Omit<Customer, 'id'|'transactionHistory' | 'orders'>) => Promise<Customer | null>,
    existingOrder: Order | null,
}) {
    const [customerId, setCustomerId] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
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
    const [deliveryFees, setDeliveryFees] = useState(0);
    const [previousBalance, setPreviousBalance] = useState(0);

    const { toast } = useToast();
    
    const isEditMode = !!existingOrder;

    const resetForm = useCallback(() => {
        setCustomerId('');
        setOrderDate(new Date().toISOString().split('T')[0]);
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
        setDeliveryFees(0);
        setPreviousBalance(0);
        onOpenChange(false);
    }, [onOpenChange]);
    
    useEffect(() => {
        if (isOpen && existingOrder) {
            setCustomerId(existingOrder.customerId);
            setOrderDate(new Date(existingOrder.orderDate).toISOString().split('T')[0]);
            setItems(existingOrder.items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    productId: item.productId,
                    quantity: String(item.quantity),
                    price: String(item.price),
                    cost: String(item.cost),
                    gst: String(item.gst),
                    stock: (product?.stock ?? 0) + (isEditMode ? item.quantity : 0) // Add back current item quantity to stock for validation
                }
            }));
            setPaymentTerm(existingOrder.paymentTerm);
            if(existingOrder.paymentTerm === 'Full Payment' && existingOrder.payments && existingOrder.payments.length > 0) {
                setPaymentMode(existingOrder.payments[0].method || 'Cash');
                setPaymentRemarks(existingOrder.payments[0].notes || '');
            } else {
                setDueDate(existingOrder.dueDate ? new Date(existingOrder.dueDate).toISOString().split('T')[0] : '');
            }
            setDeliveryDate(existingOrder.deliveryDate ? new Date(existingOrder.deliveryDate).toISOString().split('T')[0] : '');
            setDeliveryAddress(existingOrder.deliveryAddress || '');
            setIsGstInvoice(existingOrder.isGstInvoice);
            setDiscount(existingOrder.discount);
            setEnableDiscount(existingOrder.discount > 0);
            setDeliveryFees(existingOrder.deliveryFees);
            setPreviousBalance(existingOrder.previousBalance);
        } else if (isOpen && !existingOrder) {
            // For new orders, always reset the form but keep dialog open
            setCustomerId('');
            setOrderDate(new Date().toISOString().split('T')[0]);
            setItems([]);
            setPaymentTerm('Full Payment');
            setPreviousBalance(0);
            setDiscount(0);
            setDeliveryFees(0);
            setEnableDiscount(false);
        }
    }, [isOpen, existingOrder, products, isEditMode]);


    useEffect(() => {
        const fetchBalance = async () => {
            if (customerId) {
                 // For edit mode, we use the stored previousBalance.
                if (isEditMode && existingOrder) {
                    setPreviousBalance(existingOrder.previousBalance);
                } else {
                    const balance = await getCustomerBalance(customerId);
                    setPreviousBalance(balance);
                }
                const customer = customers.find(c => c.id === customerId);
                if (customer) {
                    setDeliveryAddress(customer.address);
                }
            } else {
                setPreviousBalance(0);
                setDeliveryAddress('');
            }
        };
        if (isOpen) {
          fetchBalance();
        }
    }, [customerId, customers, isOpen, isEditMode, existingOrder]);

    const handleProductSelect = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setCurrentItem({
                productId: product.id,
                quantity: '',
                price: String(product.price),
                cost: String(product.cost),
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
        
        let stock = product?.stock || 0;
        if (isEditMode) {
            const originalItem = existingOrder?.items.find(i => i.productId === itemToEdit.productId);
            if (originalItem) {
                stock += originalItem.quantity;
            }
        }

        setCurrentItem({ ...itemToEdit, stock: stock });
    };
    
    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleAddCustomerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newCustomerData = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
        };
        const newCustomer = await onCustomerAdded(newCustomerData);
        if (newCustomer) {
            setIsAddCustomerOpen(false);
            setCustomerId(newCustomer.id);
        }
    };

    const { subTotal, currentInvoiceTotal } = useMemo(() => {
        const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);
        
        const totalGst = isGstInvoice 
            ? items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0) * ((parseFloat(item.gst) || 0) / 100)), 0)
            : 0;
        
        const totalValue = subTotal + totalGst;
        return { subTotal, currentInvoiceTotal: totalValue };
    }, [items, isGstInvoice]);

    const grandTotal = useMemo(() => currentInvoiceTotal - discount + deliveryFees + previousBalance, [currentInvoiceTotal, discount, deliveryFees, previousBalance]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

        let orderData: Omit<Order, 'id'> | Order = {
            id: isEditMode ? existingOrder.id : '',
            customerId,
            orderDate,
            customerName: customer.name,
            items: items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    productId: item.productId,
                    productName: product?.name || 'Unknown',
                    quantity: parseInt(item.quantity) || 0,
                    price: parseFloat(item.price) || 0,
                    cost: parseFloat(item.cost) || 0,
                    gst: parseFloat(item.gst) || 0,
                };
            }),
            total: currentInvoiceTotal,
            previousBalance,
            discount,
            deliveryFees,
            grandTotal,
            paymentTerm,
            deliveryAddress: deliveryAddress || customer.address,
            isGstInvoice,
            isOpeningBalance: items.some(item => item.productId === 'OPENING_BALANCE'),
            ...(deliveryDate && { deliveryDate }),
            ...{
                payments: paymentTerm === 'Full Payment' ? [{
                    id: 'temp-payment-id',
                    paymentDate: orderDate,
                    amount: grandTotal,
                    method: paymentMode,
                    notes: paymentRemarks,
                }] : (isEditMode ? existingOrder.payments : []),
                balanceDue: paymentTerm === 'Credit' ? grandTotal : 0,
                status: paymentTerm === 'Full Payment' ? 'Fulfilled' : 'Pending',
                dueDate: paymentTerm === 'Credit' ? dueDate : undefined,
            }
        };
        
        if (isEditMode) {
             try {
                await onOrderUpdated(orderData as Order);
                resetForm();
            } catch(e) {
                // error is toasted in parent
            }
        } else {
             try {
               await onOrderAdded(orderData as Omit<Order, 'id' | 'customerName'>);
               resetForm();
           } catch (e) {
                // Error is already toasted in the parent component
           }
        }
    };

    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: c.name })), [customers]);
    const productOptions = useMemo(() => {
        const standardProducts = products.map(p => ({ value: p.id, label: `${p.name} (SKU: ${p.sku})` }));
        const openingBalanceOption = { value: 'OPENING_BALANCE', label: 'Opening Balance' };
        return [openingBalanceOption, ...standardProducts];
    }, [products]);


    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if(!open) resetForm(); else onOpenChange(open);}}>
                <DialogContent className="max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? `Edit Order ${existingOrder.id}`: 'Place New Order'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <ScrollArea className="h-[70vh]">
                            <div className="space-y-4 p-4">

                                {/* Order Details */}
                                <Card>
                                    <CardContent className="p-4 space-y-4">
                                        <DialogTitle className="text-lg">Order Details</DialogTitle>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="customer">Customer Name</Label>
                                                <div className="flex gap-2">
                                                    <Combobox 
                                                        options={customerOptions}
                                                        value={customerId}
                                                        onValueChange={setCustomerId}
                                                        placeholder="Select a customer"
                                                        searchPlaceholder="Search customers..."
                                                        emptyPlaceholder="No customer found."
                                                    />
                                                    <Button type="button" variant="outline" onClick={() => setIsAddCustomerOpen(true)}>Add New</Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="orderDate">Order Date</Label>
                                                <Input id="orderDate" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                                            </div>
                                        </div>
                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                             {previousBalance > 0 && (
                                                <div className="flex items-center justify-start">
                                                    <div className="text-right p-2 bg-amber-100 border border-amber-200 rounded-md">
                                                        <div className="text-sm font-medium text-amber-800">Previous Balance</div>
                                                        <div className="text-lg font-bold text-amber-900">{formatNumberForDisplay(previousBalance)}</div>
                                                    </div>
                                                </div>
                                            )}
                                         </div>
                                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                                            <div className="space-y-2 col-span-2">
                                                <Label>Item Name</Label>
                                                 <Combobox 
                                                    options={productOptions}
                                                    value={currentItem.productId}
                                                    onValueChange={handleProductSelect}
                                                    placeholder="Select an item"
                                                    searchPlaceholder="Search items..."
                                                    emptyPlaceholder="No item found."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Stock Left</Label>
                                                <Input value={currentItem.productId === 'OPENING_BALANCE' ? 'N/A' : currentItem.stock} readOnly disabled />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Quantity</Label>
                                                <Input type="number" placeholder="" value={currentItem.quantity} onChange={e => setCurrentItem(s => ({ ...s, quantity: e.target.value }))} min="1" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sale Price</Label>
                                                <Input type="number" value={currentItem.price} onChange={e => setCurrentItem(s => ({ ...s, price: e.target.value }))} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Cost Price</Label>
                                                <Input type="number" value={currentItem.cost} onChange={e => setCurrentItem(s => ({ ...s, cost: e.target.value }))} />
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
                                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Price</TableHead><TableHead>Cost</TableHead><TableHead>GST</TableHead><TableHead>Total</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {items.map((item, index) => {
                                                    const product = products.find(p => p.id === item.productId);
                                                    const price = parseFloat(item.price) || 0;
                                                    const cost = parseFloat(item.cost) || 0;
                                                    const quantity = parseInt(item.quantity) || 0;
                                                    const gst = parseFloat(item.gst) || 0;
                                                    const itemTotal = isGstInvoice
                                                        ? price * quantity * (1 + gst / 100)
                                                        : price * quantity;
                                                    return (
                                                        <TableRow key={index}>
                                                            <TableCell>{item.productId === 'OPENING_BALANCE' ? 'Opening Balance' : product?.name}</TableCell>
                                                            <TableCell>{item.quantity}</TableCell>
                                                            <TableCell>{formatNumberForDisplay(price)}</TableCell>
                                                            <TableCell>{formatNumberForDisplay(cost)}</TableCell>
                                                            <TableCell>{isGstInvoice ? `${item.gst}%` : 'N/A'}</TableCell>
                                                            <TableCell>{formatNumberForDisplay(itemTotal)}</TableCell>
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
                                            <div className="flex justify-between"><span>Current Items Total:</span> <span className="font-semibold">{formatNumberForDisplay(currentInvoiceTotal)}</span></div>
                                            {previousBalance > 0 && <div className="flex justify-between text-destructive"><span>Previous Due:</span> <span className="font-semibold">{formatNumberForDisplay(previousBalance)}</span></div>}
                                             <div className="flex justify-between items-center">
                                                <Label htmlFor="delivery_fees" className="flex-1">Delivery Fees</Label>
                                                <Input type="number" placeholder="0.00" className="w-24 h-8" value={String(deliveryFees)} onChange={e => setDeliveryFees(parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id="enable_discount" checked={enableDiscount} onCheckedChange={c => setEnableDiscount(c as boolean)} />
                                                    <Label htmlFor="enable_discount" className="flex-1">Discount</Label>
                                                </div>
                                                <Input type="number" placeholder="0.00" className="w-24 h-8" value={String(discount)} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} disabled={!enableDiscount} />
                                            </div>
                                            <Separator />
                                            <div className="flex justify-between text-lg">
                                                <span className="font-bold">Grand Total:</span>
                                                <span className="font-bold text-primary">{formatNumberForDisplay(grandTotal)}</span>
                                            </div>
                                            
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
                            <Button type="submit">{isEditMode ? 'Update Order' : 'Submit Order'}</Button>
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

      
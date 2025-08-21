

'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Order, Customer, Product, PaymentTerm, PaymentMode, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileText, Receipt, Loader2, PlusCircle, Trash2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addOrder, addCustomer } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceTemplate } from '@/components/invoice-template';
import { startOfWeek, startOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox } from '@/components/ui/combobox';


const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '₹0.00';
    return `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
};

const formatCurrencyForPdf = (value: number | undefined): string => {
    if (value === undefined || isNaN(value)) return 'INR 0.00';
    const sign = value < 0 ? '-' : '';
    const absValue = Math.abs(value);
    const formattedValue = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absValue);
    
    // Handle the negative sign placement for discounts
    return sign ? `${sign} INR ${formattedValue}` : `INR ${formattedValue}`;
}


export function OrdersClient({ orders: initialOrders, customers: initialCustomers, products: initialProducts }: { orders: Order[], customers: Customer[], products: Product[] }) {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
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

    const handlePrint = async () => {
        if (!orderToPrint) return;
        
        const customer = customers.find(c => c.id === orderToPrint.customerId);
        if (!customer) {
            toast({ title: 'Error', description: 'Customer not found for this order.', variant: 'destructive'});
            setOrderToPrint(null);
            return;
        }

        setIsLoading(true);
        try {
            const doc = new jsPDF();
            doc.setFont('helvetica', 'normal');

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            let yPos = 20;

            // --- Header ---
            if (logoUrl) {
                try {
                    const img = new Image();
                    img.src = logoUrl;
                    await new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve; // Continue even if logo fails
                    });
                    if (img.complete && img.width > 0) {
                         const logoWidth = 25;
                         const logoHeight = (img.height * logoWidth) / img.width;
                        doc.addImage(logoUrl, 'PNG', pageWidth / 2 - (logoWidth/2), yPos, logoWidth, logoHeight);
                        yPos += logoHeight + 2;
                    }
                } catch(e) {
                    console.error("Error adding logo image to PDF:", e);
                }
            }
            
            doc.setFontSize(14).setFont('helvetica', 'bold');
            doc.text('AB Agency', pageWidth / 2, yPos, { align: 'center' });
            yPos += 6;

            doc.setFontSize(9).setFont('helvetica', 'normal');
            doc.text('No.1, Ayyanchery main road, Ayyanchery, Urapakkam, Chennai - 603210', pageWidth / 2, yPos, { align: 'center' });
            yPos += 4;
            doc.text(`Email: abagency1977@gmail.com | MOB: 95511 95505 / 95001 82975`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 5;
            
            doc.setDrawColor(200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;
            
            // --- Billed To and Invoice Details ---
            const billToY = yPos;
            doc.setFontSize(10).setFont('helvetica', 'bold');
            doc.text('Billed To:', margin, yPos);
            yPos += 6;
            
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(customer.name, margin, yPos);
            yPos += 5;

            const customerAddressLines = doc.splitTextToSize(customer.address || '', 80);
            customerAddressLines.forEach((line: string) => {
                doc.text(line, margin, yPos);
                yPos += 5;
            });
            
            yPos += 5; // Single line space after address
            doc.text(`${customer.email} | ${customer.phone}`, margin, yPos);

            const rightColX = pageWidth - margin;
            let rightColY = billToY;

            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text('Invoice', rightColX, rightColY, { align: 'right'});
            rightColY += 8;
            
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(`# ${orderToPrint.id.replace('ORD', 'INV')}`, rightColX, rightColY, { align: 'right'});
            rightColY += 5;
            doc.text(`Date: ${new Date(orderToPrint.orderDate).toLocaleDateString('en-GB')}`, rightColX, rightColY, { align: 'right'});
            rightColY += 5;
            if(orderToPrint.deliveryDate) {
                doc.text(`Delivery Date: ${new Date(orderToPrint.deliveryDate).toLocaleDateString('en-GB')}`, rightColX, rightColY, { align: 'right'});
            }
            
            let tableStartY = Math.max(yPos, rightColY) + 15;
            
            // --- Items Table ---
            const subtotal = orderToPrint.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const totalGst = orderToPrint.isGstInvoice ? orderToPrint.items.reduce((acc, item) => acc + (item.price * item.quantity * (item.gst / 100)), 0) : 0;
            
            const tableColumns = ['#', 'Item Description', 'Qty', 'Rate', 'Amount'];
            if(orderToPrint.isGstInvoice) tableColumns.splice(4, 0, 'GST');
            
            const tableRows = orderToPrint.items.map((item, index) => {
                const rowData: (string | number)[] = [
                    (index + 1),
                    item.productName,
                    item.quantity,
                    formatCurrencyForPdf(item.price),
                    formatCurrencyForPdf(item.price * item.quantity)
                ];
                if(orderToPrint.isGstInvoice) rowData.splice(4, 0, `${item.gst}%`);
                return rowData;
            });
            
            autoTable(doc, {
                startY: tableStartY,
                head: [tableColumns],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [34, 34, 34], textColor: 255, font: 'helvetica', fontStyle: 'bold', fontSize: 9 },
                styles: { fontSize: 9, font: 'helvetica', cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 8, halign: 'center' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: orderToPrint.isGstInvoice ? 'center' : 'right' },
                    5: { halign: 'right' }
                },
            });

            let finalY = (doc as any).lastAutoTable.finalY || tableStartY + 20;

            // --- Totals Section (Right Aligned) ---
            const totalsData = [
                ['Subtotal:', formatCurrencyForPdf(subtotal)],
                ...(orderToPrint.isGstInvoice ? [['Total GST:', formatCurrencyForPdf(totalGst)]] : []),
                ...(orderToPrint.deliveryFees > 0 ? [['Delivery Fees:', formatCurrencyForPdf(orderToPrint.deliveryFees)]] : []),
                ...(orderToPrint.discount > 0 ? [['Discount:', formatCurrencyForPdf(orderToPrint.discount * -1)]] : []),
            ];
            
            autoTable(doc, {
                startY: finalY + 8,
                body: totalsData,
                theme: 'plain',
                tableWidth: 80, 
                margin: { left: pageWidth - margin - 80 },
                styles: {
                    font: 'helvetica',
                    fontStyle: 'bold',
                    overflow: 'linebreak',
                    cellPadding: 1.5,
                    fontSize: 10,
                },
                columnStyles: {
                    0: { halign: 'right' },
                    1: { halign: 'right' },
                },
            });
            finalY = (doc as any).lastAutoTable.finalY;

            // --- Grand Total (Center Aligned, Blue Box) ---
            finalY += 10;
            const grandTotalText = `Grand Total: ${formatCurrencyForPdf(orderToPrint.grandTotal)}`;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            
            const textWidth = doc.getTextWidth(grandTotalText);
            const boxWidth = textWidth + 20;
            const boxHeight = 12;
            const boxX = (pageWidth - boxWidth) / 2;

            // Blue background box
            doc.setFillColor(224, 242, 254); // Light blue color
            doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 3, 3, 'F');

            // White text
            doc.setTextColor(23, 78, 166); // Darker blue for text
            doc.text(grandTotalText, pageWidth / 2, finalY + boxHeight/2 + 1, { align: 'center', baseline: 'middle' });


            // --- Final Footer ---
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFont('helvetica', 'normal').setFontSize(8);
            doc.setTextColor(100,116,139); // gray-500
            const footerY = doc.internal.pageSize.getHeight() - 15;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text('Thank you for your business!', pageWidth/2, footerY, { align: 'center'});
                doc.text('This is a computer-generated invoice and does not require a signature.', pageWidth/2, footerY + 5, { align: 'center'});
            }

            doc.save(`invoice-${orderToPrint.id}.pdf`);
            toast({ title: 'Success', description: 'Invoice PDF has been downloaded.' });

        } catch (error) {
            console.error('Failed to generate invoice:', error);
            toast({ title: 'Error', description: 'Failed to generate invoice PDF.', variant: 'destructive'});
        } finally {
            setIsLoading(false);
            setOrderToPrint(null);
        }
    };


    const handleAddOrder = async (newOrderData: Omit<Order, 'id' | 'customerName'>) => {
       try {
           const newOrder = await addOrder(newOrderData);
           setOrders(prevOrders => [newOrder, ...prevOrders]);
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
                 <Button onClick={() => setIsAddOrderOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Place Order
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
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id}</TableCell>
                                <TableCell>{order.customerName}</TableCell>
                                <TableCell>{new Date(order.orderDate).toLocaleDateString('en-IN')}</TableCell>
                                <TableCell>
                                    <Badge variant={order.status === 'Fulfilled' ? 'default' : order.status === 'Pending' ? 'secondary' : 'destructive'} className="capitalize">{order.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatNumber(order.grandTotal)}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={order.status === 'Canceled'}>
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleGenerateInvoice(order)} disabled={isLoading}>
                                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :<FileText className="mr-2 h-4 w-4" />}
                                                Generate Invoice
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
                isOpen={isAddOrderOpen}
                onOpenChange={setIsAddOrderOpen}
                customers={customers}
                products={products}
                onOrderAdded={handleAddOrder}
                onCustomerAdded={handleAddCustomer}
            />
        </div>
    );
}

const initialItemState = { productId: '', quantity: '', price: '', gst: '', stock: 0 };
type OrderItemState = { productId: string, quantity: string, price: string, gst: string, stock: number };

function AddOrderDialog({ isOpen, onOpenChange, customers, products, onOrderAdded, onCustomerAdded }: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    customers: Customer[],
    products: Product[],
    onOrderAdded: (order: Omit<Order, 'id' | 'customerName'>) => Promise<Order>,
    onCustomerAdded: (customer: Omit<Customer, 'id'|'transactionHistory' | 'orders'>) => Promise<Customer | null>,
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
    const [deliveryFees, setDeliveryFees] = useState(0);

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
        setDeliveryFees(0);
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

    const handleAddCustomerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newCustomerData = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
        };
        const newCustomer = await onCustomerAdded(newCustomerData);
        if (newCustomer) {
            setIsAddCustomerOpen(false);
            setCustomerId(newCustomer.id);
        }
    };

    const { subTotal, totalGst, total } = useMemo(() => {
        const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);
        
        let totalGst = 0;
        if (isGstInvoice) {
            totalGst = items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0) * ((parseFloat(item.gst) || 0) / 100)), 0);
        }
        
        const totalValue = subTotal + totalGst;
        return { subTotal, totalGst, total: totalValue };
    }, [items, isGstInvoice]);

    const grandTotal = useMemo(() => total - discount + deliveryFees, [total, discount, deliveryFees]);

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

        let baseOrderData: Omit<Order, 'id' | 'customerName'> = {
            customerId,
            orderDate: new Date().toISOString().split('T')[0],
            status: 'Fulfilled', // All orders are fulfilled
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
            deliveryFees,
            grandTotal,
            paymentTerm,
            deliveryAddress: deliveryAddress || customer.address,
            isGstInvoice,
            ...(deliveryDate && { deliveryDate }),
            ...(paymentTerm === 'Full Payment' && { 
                paymentMode, 
                paymentRemarks,
                balanceDue: 0,
                payments: [{
                    paymentDate: new Date().toISOString().split('T')[0],
                    amount: grandTotal,
                    method: paymentMode,
                    notes: paymentRemarks,
                }]
            }),
            ...(paymentTerm === 'Credit' && {
                dueDate,
                balanceDue: grandTotal,
                payments: []
            })
        };

       try {
           await onOrderAdded(baseOrderData);
           resetForm();
       } catch (e) {
            // Error is already toasted in the parent component
       }
    };

    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: c.name })), [customers]);
    const productOptions = useMemo(() => products.map(p => ({ value: p.id, label: p.name })), [products]);


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
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
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
                                            <div className="flex justify-between"><span>Subtotal:</span> <span className="font-semibold">{formatNumber(subTotal)}</span></div>
                                            {isGstInvoice && <div className="flex justify-between"><span>Total GST:</span> <span className="font-semibold">{formatNumber(totalGst)}</span></div>}
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
                                                <span className="font-bold">Grand Total Value:</span>
                                                <span className="font-bold text-primary">{formatNumber(grandTotal)}</span>
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

    

    


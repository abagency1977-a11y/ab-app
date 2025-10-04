'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Order, Payment, PaymentMode, Customer, SortKey } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Receipt, Trash2, Share2, ArrowUpDown, MoreHorizontal, Edit, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// Ensure ReceiptTemplate is properly imported
import { ReceiptTemplate } from '@/components/receipt-template'; 
// Ensure all necessary data functions are imported
import { addPaymentToOrder, deleteOrder, getOrders, getCustomers, deletePaymentFromOrder } from '@/lib/data'; 
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type SortKey = keyof Order | 'id' | 'customerName' | 'orderDate' | 'status' | 'balanceDue' | 'grandTotal' | 'total' | 'previousBalance';

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);
};

const getCustomerName = (customerId: string, customers: Customer[]) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
};

// --- INLINE InvoiceTable Component (Your existing table) ---
const InvoiceTable = ({ invoices, onRowClick, onDeleteClick, sortConfig, requestSort, customers }: { 
    invoices: Order[], 
    onRowClick: (invoice: Order) => void, 
    onDeleteClick: (invoice: Order) => void,
    sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null,
    requestSort: (key: SortKey) => void,
    customers: Customer[],
}) => (
    <div className="rounded-lg border shadow-sm">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('id')}>Invoice ID <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('customerName')}>Customer <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('orderDate')}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('status')}>Status <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('total')}>Invoice Amount <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('previousBalance')}>Previous Balance <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('grandTotal')}>Total <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('balanceDue')}>Balance Due <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.map((invoice) => {
                    const invoiceAmount = (invoice.total || 0) + (invoice.deliveryFees || 0) - (invoice.discount || 0);
                    const hasDue = (invoice.balanceDue ?? 0) > 0;
                    return (
                        <TableRow key={invoice.id} className="transition-transform hover:-translate-y-px hover:shadow-md">
                            {/* Keep row click for quick view/edit sheet */}
                            <TableCell onClick={() => onRowClick(invoice)} className="font-medium cursor-pointer">{invoice.id.replace('ORD', 'INV')}</TableCell>
                            <TableCell onClick={() => onRowClick(invoice)} className="cursor-pointer">{getCustomerName(invoice.customerId, customers)}</TableCell>
                            <TableCell onClick={() => onRowClick(invoice)} className="cursor-pointer">{new Date(invoice.orderDate).toLocaleDateString('en-IN')}</TableCell>
                            <TableCell onClick={() => onRowClick(invoice)} className="cursor-pointer">
                                <Badge variant={invoice.status === 'Fulfilled' ? 'default' : invoice.status === 'Pending' ? 'secondary' : invoice.status === 'Part Payment' ? 'outline' : 'destructive'} className="capitalize">{invoice.status}</Badge>
                            </TableCell>
                            <TableCell onClick={() => onRowClick(invoice)} className="text-right cursor-pointer">{formatNumber(invoiceAmount)}</TableCell>
                            <TableCell onClick={() => onRowClick(invoice)} className={cn("text-right cursor-pointer", hasDue && "text-destructive")}>{formatNumber(invoice.previousBalance)}</TableCell>
                            <TableCell onClick={() => onRowClick(invoice)} className="text-right font-bold cursor-pointer">{formatNumber(invoice.grandTotal)}</TableCell>
                            <TableCell onClick={() => onRowClick(invoice)} className={cn('text-right font-medium cursor-pointer', hasDue && 'text-destructive')}>
                                {formatNumber(invoice.balanceDue)}
                            </TableCell>
                             <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <SheetTrigger asChild>
                                            <DropdownMenuItem onClick={() => onRowClick(invoice)}>
                                                <Edit className="mr-2 h-4 w-4" /> View/Edit Invoice
                                            </DropdownMenuItem>
                                        </SheetTrigger>

                                        <DropdownMenuSeparator />
                                        
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem
                                                onClick={() => onDeleteClick(invoice)} // setInvoiceToDelete
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    </div>
);
// --- END InvoiceTable Component ---

export function InvoicesClient({ orders: initialOrders, customers: initialCustomers }: { orders: Order[], customers: Customer[] }) {
    // --- STATE DECLARATIONS ---
    const [allInvoices, setAllInvoices] = useState<Order[]>(initialOrders);
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Order | null>(null);
    const [receiptToPrint, setReceiptToPrint] = useState<{order: Order, payment: Payment, historicalPayments: Payment[]} | null>(null);
    const [isReceiptLoading, setIsReceiptLoading] = useState(false);
    const { toast } = useToast();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
    const [isMounted, setIsMounted] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMode>('Cash'); 
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // For payment deletion

    useEffect(() => {
        setIsMounted(true);
        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) {
            setLogoUrl(savedLogo);
        }
    }, []);

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const refreshOrders = async () => {
        try {
            const fetchedOrders = await getOrders();
            setAllInvoices(fetchedOrders);
            // Update the selected invoice's details in the sheet
            if (selectedInvoice) {
                const updatedInvoice = fetchedOrders.find(o => o.id === selectedInvoice.id);
                setSelectedInvoice(updatedInvoice || null);
            }
        } catch (error) {
            console.error("Failed to refresh orders:", error);
            toast({
                title: "Data Refresh Failed",
                description: "Could not refresh invoice data after operation.",
                variant: "destructive",
            });
        }
    }; 
    
    // ⭐️ PAYMENT DELETION HANDLER ⭐️
    const handleDeletePayment = async (customerId: string, orderId: string, paymentId: string) => {
        setIsDeleting(true);
        try {
            await deletePaymentFromOrder(customerId, orderId, paymentId);
            toast({
                title: "Payment Deleted",
                description: "The payment record has been successfully removed.",
            });
            await refreshOrders(); 
        } catch (error) {
            toast({
                title: "Deletion Failed",
                description: "Failed to delete the payment record. Please check the console.",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    // --- PAYMENT RECORD HANDLER ---
    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice || parseFloat(paymentAmount) <= 0 || isPaymentLoading) return;
        
        setIsPaymentLoading(true);
        const amount = parseFloat(paymentAmount);
        const maxAmount = selectedInvoice.balanceDue ?? 0;

        if (amount > maxAmount) {
             toast({ title: "Invalid Amount", description: "Payment amount exceeds balance due.", variant: "destructive" });
             setIsPaymentLoading(false);
             return;
        }

        try {
            // Note: The structure of addPaymentToOrder may vary. Assuming it returns the new Payment object.
            const newPayment = await addPaymentToOrder(
                selectedInvoice.customerId,
                selectedInvoice.id,
                {
                    amount: amount,
                    mode: paymentMethod,
                    date: new Date().toISOString(),
                    recordedBy: 'User' // Assuming a default value
                }
            );

            toast({ title: "Payment Recorded", description: `Recorded ${formatNumber(amount)} via ${paymentMethod}.` });
            
            // Re-fetch data to ensure all subsequent order balances are correct
            await refreshOrders();

            // Set up for printing receipt
            if (newPayment) {
                 // Get the updated invoice after refresh
                const updatedInvoice = (await getOrders()).find(o => o.id === selectedInvoice.id);
                if(updatedInvoice) {
                    // Set receipt data and immediately trigger print
                    setReceiptToPrint({
                        order: updatedInvoice,
                        payment: newPayment,
                        historicalPayments: updatedInvoice.payments.filter(p => p.id !== newPayment.id),
                    });
                }
            }

            setPaymentAmount(''); // Clear form
        } catch (error) {
            toast({ title: "Payment Failed", description: "Failed to record payment. See console for details.", variant: "destructive" });
            console.error("Error recording payment:", error);
        } finally {
            setIsPaymentLoading(false);
        }
    };

    // --- INVOICE DELETION HANDLER ---
    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return;

        try {
            await deleteOrder(invoiceToDelete.customerId, invoiceToDelete.id);
            toast({ title: "Invoice Deleted", description: `Invoice ${invoiceToDelete.id.replace('ORD', 'INV')} has been removed.` });
            
            await refreshOrders(); // Re-fetch all orders and update selected state
            setInvoiceToDelete(null);
            
            // Re-fetch customers to update their balance
            const updatedCustomers = await getCustomers();
            setCustomers(updatedCustomers);
        } catch (error) {
            toast({ title: "Deletion Failed", description: "Failed to delete the invoice. Check console.", variant: "destructive" });
            console.error("Error deleting invoice:", error);
        }
    };
    
    // --- RECEIPT DATA SETTER (Called from Payment List) ---
    const handleSetReceiptData = (payment: Payment) => {
        if (!selectedInvoice) return;
        setIsReceiptLoading(true);

        // Filter historical payments based on the selected payment date
        const paymentDate = new Date(payment.date).getTime();
        const historicalPayments = selectedInvoice.payments
            .filter(p => new Date(p.date).getTime() < paymentDate);

        setReceiptToPrint({ order: selectedInvoice, payment, historicalPayments });
    };

    // --- RECEIPT PRINT ACTION (Called from Print Modal) ---
    const handlePrintAction = async () => {
        if (!receiptToPrint || !receiptRef.current) return;
        
        try {
            toast({ title: "Generating Receipt...", description: "Please wait while the PDF is created." });
            
            // Use a short delay to ensure DOM updates are complete before capturing
            await new Promise(resolve => setTimeout(resolve, 50)); 

            const targetElement = receiptRef.current.querySelector('#printable-receipt');
            if (!targetElement) throw new Error("Printable element not found.");

            const canvas = await html2canvas(targetElement as HTMLElement, {
                scale: 2, 
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            // A4 size in mm: 210 x 297
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const imgWidth = 210; // A4 width
            const pageHeight = 297; // A4 height
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.autoPrint();
            window.open(pdf.output('bloburl'), '_blank');
            
            toast({ title: "Receipt Ready", description: "The receipt has been opened in a new tab for printing." });

        } catch (error) {
            console.error('Error generating receipt:', error);
            toast({ title: 'Print Failed', description: 'Could not create the PDF receipt.', variant: 'destructive' });
        } finally {
            setIsReceiptLoading(false);
            setReceiptToPrint(null); // Close the print modal
        }
    };


    const handleWhatsAppShare = (payment: Payment) => {
        if (!selectedInvoice) return;
        const customer = customers.find(c => c.id === selectedInvoice.customerId);
        
        // Use customer phone from the `Customer` object
        const customerPhone = customer?.phone; 

        if (!customerPhone) {
            toast({ title: 'Error', description: "Customer's phone number is not available.", variant: 'destructive'});
            return;
        }

        const sanitizedPhone = customerPhone.replace(/\D/g, '');
        const formattedAmount = formatNumber(payment.amount).replace(/\u00A0/g, ' ');
        const message = `Hello ${customer.name}, here is the receipt for your payment of ${formattedAmount} towards invoice ${selectedInvoice.id.replace('ORD', 'INV')}. Thank you!`;
        const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
    };

    // --- SORTING AND FILTERING LOGIC (Corrected to use proper key types) ---
    const sortedInvoices = useMemo(() => {
        let sortableItems = [...allInvoices];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                // Safely access properties or fallback to customerName/ID if not a direct Order key
                const aValue = (a as any)[sortConfig.key] ?? a.customerName;
                const bValue = (b as any)[sortConfig.key] ?? b.customerName;

                if (sortConfig.key === 'orderDate') {
                    const dateA = new Date(a.orderDate).getTime();
                    const dateB = new Date(b.orderDate).getTime();
                    return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
                }
                
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                }
                
                const strA = String(aValue || '').toLowerCase();
                const strB = String(bValue || '').toLowerCase();

                if (strA < strB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (strA > strB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [allInvoices, sortConfig]);

    const filteredInvoices = useMemo(() => {
        if (!searchQuery) return sortedInvoices;
        const query = searchQuery.toLowerCase();
        return sortedInvoices.filter(invoice => 
            invoice.id.toLowerCase().includes(query) ||
            (invoice.customerName || '').toLowerCase().includes(query) ||
            invoice.status.toLowerCase().includes(query) ||
            invoice.orderDate.toLowerCase().includes(query)
        );
    }, [sortedInvoices, searchQuery]);

    const handleRowClick = (invoice: Order) => {
        const freshInvoice = allInvoices.find(i => i.id === invoice.id) || invoice;
        setSelectedInvoice(freshInvoice);
    };

    const handleInvoiceDeleteClick = (invoice: Order) => {
        setInvoiceToDelete(invoice);
    };


    if (!isMounted) {
        // Skeleton loading state
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="rounded-lg border shadow-sm">
                    <Table>
                        <TableHeader><TableRow>{Array(9).fill(0).map((_, i) => <TableHead key={i}><Skeleton className="h-6 w-24" /></TableHead>)}</TableRow></TableHeader>
                        <TableBody>{Array(10).fill(0).map((_, i) => <TableRow key={i}>{Array(9).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)}</TableBody>
                    </Table>
                </div>
            </div>
        );
    }
    // --- COMPONENT RETURN ---
    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold mb-6">Invoices Management</h1>
            <div className="flex justify-between items-center mb-4">
                <Input 
                    placeholder="Search invoices by ID, customer, or status..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:w-fit">
                    <TabsTrigger value="all">All Invoices ({allInvoices.length})</TabsTrigger>
                    <TabsTrigger value="due">Balance Due ({allInvoices.filter(i => (i.balanceDue ?? 0) > 0).length})</TabsTrigger>
                    <TabsTrigger value="fulfilled">Fulfilled ({allInvoices.filter(i => i.status === 'Fulfilled').length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                    <InvoiceTable 
                        invoices={filteredInvoices} 
                        onRowClick={handleRowClick}
                        onDeleteClick={handleInvoiceDeleteClick}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        customers={customers}
                    />
                </TabsContent>
                <TabsContent value="due" className="mt-4">
                    <InvoiceTable 
                         invoices={filteredInvoices.filter(i => (i.balanceDue ?? 0) > 0)}
                         onRowClick={handleRowClick}
                         onDeleteClick={handleInvoiceDeleteClick}
                         sortConfig={sortConfig}
                         requestSort={requestSort}
                         customers={customers}
                    />
                </TabsContent>
                <TabsContent value="fulfilled" className="mt-4">
                    <InvoiceTable 
                        invoices={filteredInvoices.filter(i => i.status === 'Fulfilled')}
                        onRowClick={handleRowClick}
                        onDeleteClick={handleInvoiceDeleteClick}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        customers={customers}
                    />
                </TabsContent>
            </Tabs>

            {/* Invoice Detail Sheet/Drawer */}
            <Sheet open={!!selectedInvoice} onOpenChange={(open) => {
                 if (!open) {
                    setSelectedInvoice(null);
                    setPaymentAmount('');
                    setIsDeleting(false); // Reset delete state when closing
                 }
            }}>
                <SheetContent side="right" className="sm:max-w-xl flex flex-col">
                    <SheetHeader>
                        <SheetTitle>Invoice # {selectedInvoice?.id.replace('ORD', 'INV')}</SheetTitle>
                        <SheetDescription>
                            Customer: {selectedInvoice && getCustomerName(selectedInvoice.customerId, customers)}
                        </SheetDescription>
                    </SheetHeader>
                    
                    {selectedInvoice && (
                        <div className="flex-grow overflow-y-auto p-4">
                            {/* --- ORDER SUMMARY CARDS --- */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <Card>
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <div className="text-xl font-bold">{formatNumber(selectedInvoice.grandTotal)}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <div className={cn("text-xl font-bold", (selectedInvoice.balanceDue ?? 0) > 0 && "text-destructive")}>
                                            {formatNumber(selectedInvoice.balanceDue)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            {/* --- RECORD PAYMENT FORM --- */}
                            <Card className="mb-4">
                                <CardHeader>
                                    <CardTitle>Record New Payment</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleRecordPayment} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="paymentAmount">Amount to Pay (Max: {formatNumber(selectedInvoice.balanceDue)})</Label>
                                            <Input
                                                id="paymentAmount"
                                                type="number"
                                                step="0.01"
                                                max={selectedInvoice.balanceDue}
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                required
                                            />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="paymentMethod">Payment Method</Label>
                                            <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMode)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Cash">Cash</SelectItem>
                                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                                                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button type="submit" className="w-full" disabled={isPaymentLoading || parseFloat(paymentAmount) <= 0 || (selectedInvoice.balanceDue ?? 0) <= 0}>
                                            {isPaymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Record Payment
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <Separator className="my-4" />
                            <h3 className="text-lg font-semibold mb-2">Payment Records</h3>

                            {/* --- MODIFIED PAYMENT RECORDS LIST with DELETE BUTTON --- */}
                            {selectedInvoice.payments.length === 0 ? (
								<p className="text-sm text-gray-500">No payment records found for this invoice.</p>
							) : (
							<div className="space-y-2">
								{/* Sort payments by date descending for history view */}
								{selectedInvoice.payments.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((payment) => (
									<div key={payment.id} className="flex justify-between items-center p-3 border rounded-md">
										<div className="flex flex-col">
											<span className="font-medium">Amount: {formatNumber(payment.amount)}</span>
											<span className="text-sm text-gray-600">
												{new Date(payment.date).toLocaleDateString('en-IN')} via {payment.mode}
											</span>
										</div>
                
										<div className="flex space-x-2">
											{/* 1. Print Receipt Button (Existing) */}
											<Button 
												variant="ghost" 
												size="icon" 
												title="Print Receipt"
												onClick={() => handleSetReceiptData(payment)} // Sets data to open modal
												disabled={isReceiptLoading}
											>
												<Receipt className="h-4 w-4" />
											</Button>
                    
											{/* 2. WhatsApp Share Button (Existing) */}
											<Button 
												variant="ghost" 
												size="icon" 
												title="Share Receipt (WhatsApp)"
												onClick={() => handleWhatsAppShare(payment)} 
											>
												<Share2 className="h-4 w-4" />
											</Button>

											{/* ⭐️ 3. DELETE PAYMENT BUTTON ⭐️ */}
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button 
														variant="ghost" 
														size="icon" 
														title="Delete Payment Record" 
														className="text-red-500 hover:text-red-700"
														disabled={isDeleting}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Confirm Payment Deletion</AlertDialogTitle>
														<AlertDialogDescription>
															Are you sure you want to delete this payment of <span className="font-bold">{formatNumber(payment.amount)}</span>? This action is permanent and will affect the invoice balance and customer running balance.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction 
															onClick={() => handleDeletePayment(
																selectedInvoice.customerId,
																selectedInvoice.id,
																payment.id
															)} 
															disabled={isDeleting}
															className="bg-destructive hover:bg-red-700"
														>
															{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
															Delete Record
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									</div>
								))}
							</div>
						)}
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Invoice Delete Confirmation Dialog */}
            <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete invoice <span className="font-bold">{invoiceToDelete?.id.replace('ORD', 'INV')}</span> and recalculate all subsequent customer balances.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive hover:bg-red-700">
                            Delete Invoice
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Receipt Print Modal (With integrated printing button) */}
            {receiptToPrint && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
                    <Card className="w-full max-w-xl mx-4">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Print Receipt</CardTitle>
                            <Button onClick={() => setReceiptToPrint(null)} variant="ghost">
                                <X className="h-4 w-4 mr-2" /> Close Preview
                            </Button>
                        </CardHeader>
                        <CardContent className="max-h-[70vh] overflow-y-auto">
                            <div ref={receiptRef} className="bg-white p-2 border shadow-lg mx-auto w-full max-w-sm">
                                <div id="printable-receipt">
                                    <ReceiptTemplate 
                                        order={receiptToPrint.order} 
                                        payment={receiptToPrint.payment} 
                                        historicalPayments={receiptToPrint.historicalPayments} 
                                        customer={customers.find(c => c.id === receiptToPrint.order.customerId)}
                                        logoUrl={logoUrl}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end p-4 border-t">
                             <Button onClick={handlePrintAction} disabled={isReceiptLoading} className="w-full">
                                {isReceiptLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                                Generate PDF and Print
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
} // ⭐️ FINAL CRITICAL CLOSING BRACE ⭐️
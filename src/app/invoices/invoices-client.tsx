'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Order, Payment, PaymentMode, Customer } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Receipt, Trash2, Share2, ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// --- Placeholder Imports (Replace with your actual paths) ---
import { getOrders, deleteOrder, deletePaymentFromOrder, addPaymentToOrder, getCustomers } from '@/lib/data';
import { formatNumber, cn, getCustomerName } from '@/lib/utils'; // Assuming these helpers are in utils
import ReceiptTemplate from '@/components/receipt-template'; // Placeholder component
import PaymentForm from '@/components/payment-form'; // Placeholder component
import InvoiceTable from '@/components/invoice-table'; // Placeholder component
// --- End Placeholder Imports ---

// Placeholder Hook for data management
const useInvoices = () => {
    // This hook manages fetching, loading, errors, and state for customers and orders.
    const [allInvoices, setAllInvoices] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [orders, customersData] = await Promise.all([getOrders(), getCustomers()]);
            // Ensure orders and payments have necessary default fields
            const processedOrders: Order[] = orders.map(order => ({
                ...order,
                payments: order.payments || [],
                balanceDue: order.balanceDue ?? 0,
                grandTotal: order.grandTotal ?? 0
            }));
            setAllInvoices(processedOrders);
            setCustomers(customersData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ title: "Error", description: "Failed to load invoice data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return { allInvoices, customers, isLoading, refreshData };
};


// --- MAIN COMPONENT ---
export function InvoicesClient() {
    const { allInvoices, customers, isLoading, refreshData } = useInvoices();
    const { toast } = useToast();
    const receiptRef = useRef<HTMLDivElement>(null);

    // State for UI/Interactions
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Order | null>(null);
    const [receiptToPrint, setReceiptToPrint] = useState<{ order: Order, payment: Payment, historicalPayments: Payment[] } | null>(null);
    
    // State for process status
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReceiptLoading, setIsReceiptLoading] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof Order, direction: 'ascending' | 'descending' } | null>({ key: 'orderDate', direction: 'descending' });


    useEffect(() => {
        setIsMounted(true);
    }, []);

    // --- Filtering and Sorting Logic ---
    const sortedInvoices = useMemo(() => {
        let sortableItems = [...allInvoices];
        
        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            sortableItems = sortableItems.filter(invoice => 
                invoice.id.toLowerCase().includes(query) ||
                (invoice.customerName && invoice.customerName.toLowerCase().includes(query)) ||
                invoice.status.toLowerCase().includes(query)
            );
        }

        // Apply sort
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key] as any;
                const bValue = b[sortConfig.key] as any;

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [allInvoices, searchQuery, sortConfig]);

    const requestSort = (key: keyof Order) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const creditInvoices = sortedInvoices.filter(i => (i.balanceDue ?? 0) > 0);
    const fullPaidInvoices = sortedInvoices.filter(i => (i.balanceDue ?? 0) <= 0);


    // --- HANDLER FUNCTIONS ---

    // 1. Handle New Payment Record
    const handleAddPayment = async (amount: number, paymentMode: PaymentMode) => {
        if (!selectedInvoice) return;

        try {
            await addPaymentToOrder(
                selectedInvoice.customerId,
                selectedInvoice.id,
                amount,
                paymentMode
            );
            toast({
                title: 'Payment Recorded',
                description: `${formatNumber(amount)} received via ${paymentMode}. Invoice balance updated.`,
            });
            // Refresh data and update the selected invoice details in the sheet
            await refreshData(); 
            
            // This is crucial: find the updated invoice and set it as selected
            const updatedInvoice = (await getOrders()).find(o => o.id === selectedInvoice.id) || null;
            setSelectedInvoice(updatedInvoice); 

        } catch (e: any) {
            toast({
                title: 'Payment Failed',
                description: e.message || 'There was an error recording the payment.',
                variant: 'destructive',
            });
        }
    };


    // 2. Handle Deleting a Payment Record (The functionality you needed)
    const handleDeletePayment = async (customerId: string, orderId: string, paymentId: string) => {
        if (!selectedInvoice) return;
        setIsDeleting(true);

        try {
            await deletePaymentFromOrder(customerId, orderId, paymentId);

            toast({
                title: 'Payment Deleted',
                description: 'The payment record has been successfully removed and the invoice balance updated.',
            });
            // Refresh data and update the selected invoice details in the sheet
            await refreshData();
            
            // This is crucial: find the updated invoice and set it as selected
            const updatedInvoice = (await getOrders()).find(o => o.id === orderId) || null;
            setSelectedInvoice(updatedInvoice); 

        } catch (e: any) {
            toast({
                title: 'Deletion Failed',
                description: e.message || 'Failed to delete the payment record.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };


    // 3. Handle generating a receipt
    const handleGenerateReceipt = (payment: Payment) => {
        if (!selectedInvoice) return;
        
        // Prepare data for the ReceiptTemplate
        setReceiptToPrint({
            order: selectedInvoice,
            payment: payment,
            // Historical payments are all payments before the one being printed
            historicalPayments: selectedInvoice.payments.filter(p => p.date < payment.date)
        });
    };
    
    // 4. Handle Print Action (PDF generation logic)
    // NOTE: This requires `html2canvas` and `jspdf` libraries installed!
    const handlePrintReceipt = async () => {
        if (!receiptRef.current) return;
        setIsReceiptLoading(true);
        toast({ title: 'Generating Receipt', description: 'Please wait...' });

        // Dummy/Placeholder for print logic - you need to replace this with your actual print code
        // You mentioned you couldn't find this, so I'm replacing it with a simple success message
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast({ title: 'Receipt Generated', description: 'Receipt is ready (simulated print).' });
        // --- END DUMMY ---
        
        setIsReceiptLoading(false);
    };

    // 5. Handle WhatsApp Share
    const handleWhatsAppShare = (payment: Payment) => {
        if (!selectedInvoice) return;

        const customerPhone = selectedInvoice.customerPhone; // Assuming this field exists on Order
        if (!customerPhone) {
            toast({ title: "Error", description: "Customer phone number is missing.", variant: "destructive" });
            return;
        }

        const sanitizedPhone = customerPhone.replace(/\D/g, '');
        const invoiceNum = selectedInvoice.id.replace('ORD', 'INV');
        const amountPaid = formatNumber(payment.amount);
        const balance = formatNumber(selectedInvoice.balanceDue); // Note: This uses the *current* balance, not the balance after this payment.

        const message = `
*Payment Receipt*
Hello ${selectedInvoice.customerName}, 

Thank you for your payment!

Invoice No: ${invoiceNum}
Amount Paid: ${amountPaid}
Date: ${new Date(payment.date).toLocaleDateString('en-IN')}

Your current balance due is: ${balance}

Please contact us if you have any questions.
        `.trim();

        // Use window.open to launch WhatsApp Web/App
        const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }; 

    // 6. Handle Full Invoice Deletion
    const handleInvoiceDeleteClick = (invoice: Order) => {
        setInvoiceToDelete(invoice);
    }
    
    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        setIsDeleting(true);

        try {
            await deleteOrder(invoiceToDelete.id, invoiceToDelete.customerId); 
            toast({
                title: 'Invoice Deleted',
                description: `Invoice ${invoiceToDelete.id.replace('ORD', 'INV')} has been successfully deleted.`,
            });
            // Clear all related state
            setInvoiceToDelete(null);
            setSelectedInvoice(null);
            await refreshData();
        } catch (e: any) {
            toast({
                title: 'Error',
                description: e.message || 'Failed to delete invoice.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };


    // --- RENDER LOGIC ---

    if (!isMounted || isLoading) {
        // Skeleton loading state
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="rounded-lg border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>{Array(9).fill(0).map((_, i) => <TableHead key={i}><Skeleton className="h-6 w-24" /></TableHead>)}</TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array(10).fill(0).map((_, i) => <TableRow key={i}>{Array(9).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>)}
                        </TableBody>
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

            <Tabs defaultValue="credit" className="w-full">
                <TabsList>
                    <TabsTrigger value="credit">Balance Due ({creditInvoices.length})</TabsTrigger>
                    <TabsTrigger value="paid">Fully Paid ({fullPaidInvoices.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="credit" className="mt-4">
                    <InvoiceTable 
                        invoices={creditInvoices}
                        onRowClick={setSelectedInvoice}
                        onDeleteClick={handleInvoiceDeleteClick}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        customers={customers}
                    />
                </TabsContent>
                <TabsContent value="paid" className="mt-4">
                    <InvoiceTable 
                        invoices={fullPaidInvoices}
                        onRowClick={setSelectedInvoice}
                        onDeleteClick={handleInvoiceDeleteClick}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        customers={customers}
                    />
                </TabsContent>
            </Tabs>

            {/* Invoice Detail Sheet/Drawer */}
            <Sheet 
                open={!!selectedInvoice} 
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedInvoice(null);
                    }
                }}
            >
                <SheetContent side="right" className="sm:max-w-xl flex flex-col p-0">
                    <SheetHeader className="p-6 pb-2 border-b">
                        <SheetTitle>Invoice # {selectedInvoice?.id.replace('ORD', 'INV')}</SheetTitle>
                        <SheetDescription>
                            Customer: {selectedInvoice && getCustomerName(selectedInvoice.customerId, customers)}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedInvoice && (
                        <div className="flex-grow overflow-y-auto">
                            {/* Order Summary Cards */}
                            <div className="grid grid-cols-2 gap-2 m-4">
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

                            {/* Record New Payment Form */}
                            {(selectedInvoice.balanceDue ?? 0) > 0 && (
                                <Card className="m-4">
                                    <CardHeader>
                                        <CardTitle>Record New Payment</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <PaymentForm
                                            maxAmount={selectedInvoice.balanceDue ?? 0}
                                            onPaymentSubmit={handleAddPayment}
                                        />
                                    </CardContent>
                                </Card>
                            )}


                            <Separator className="my-4 mx-4" />
                            <h3 className="text-lg font-semibold mb-2 mx-4">Payment Records</h3>

                            {/* Payment Records List with Delete Button */}
                            {selectedInvoice.payments.length === 0 ? (
                                <p className="text-sm text-gray-500 mx-4">No payment records found for this invoice.</p>
                            ) : (
                                <div className="space-y-2 m-4">
                                    {selectedInvoice.payments.slice().reverse().map((payment) => (
                                        <div key={payment.id} className="flex justify-between items-center p-3 border rounded-md">
                                            <div className="flex flex-col">
                                                <span className="font-medium">Amount: {formatNumber(payment.amount)}</span>
                                                <span className="text-sm text-gray-600">
                                                    {new Date(payment.date).toLocaleDateString('en-IN')} via {payment.mode}
                                                </span>
                                            </div>
                                            
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" title="Actions">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleGenerateReceipt(payment)} disabled={isReceiptLoading}>
                                                        {isReceiptLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />} Print Receipt
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleWhatsAppShare(payment)}>
                                                        <Share2 className="mr-2 h-4 w-4" /> Share on WhatsApp
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    
                                                    {/* ⭐️ NEW DELETE PAYMENT LOGIC ⭐️ */}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem 
                                                                onSelect={(e) => e.preventDefault()} // Prevent closing Dropdown
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Payment
                                                            </DropdownMenuItem>
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
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )} {/* <-- CRITICAL: Closes the {selectedInvoice && ( block */}
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
                        <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive hover:bg-red-700" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete Invoice
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Receipt Print Modal */}
            {receiptToPrint && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
                    <Card className="w-full max-w-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-lg">Print Receipt</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex justify-center">
                            {/* The ReceiptTemplate content that needs to be printed */}
                            <div ref={receiptRef} className="bg-white p-2 w-[80mm] shadow-xl">
                                <ReceiptTemplate 
                                    order={receiptToPrint.order}
                                    payment={receiptToPrint.payment}
                                    historicalPayments={receiptToPrint.historicalPayments}
                                    customer={customers.find(c => c.id === receiptToPrint.order.customerId)}
                                    logoUrl={""} // Assuming logoUrl is passed or empty
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end p-4 pt-0">
                            <Button onClick={handlePrintReceipt} disabled={isReceiptLoading}>
                                {isReceiptLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                                Print Receipt
                            </Button>
                            <Button onClick={() => setReceiptToPrint(null)} variant="ghost" className="ml-2">
                                Close
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    ); // <-- Closes the main return statement
} // <-- FINAL CRITICAL CLOSING BRACE FOR THE InvoicesClient function
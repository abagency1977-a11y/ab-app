
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Order, Payment, PaymentMode, Customer } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Receipt } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReceiptTemplate } from '@/components/receipt-template';
import { getCustomers } from '@/lib/data';

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const InvoiceTable = ({ invoices, onRowClick }: { invoices: Order[], onRowClick?: (invoice: Order) => void }) => (
    <div className="rounded-lg border shadow-sm">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.map((invoice) => (
                    <TableRow key={invoice.id} onClick={() => onRowClick?.(invoice)} className={onRowClick ? 'cursor-pointer' : ''}>
                        <TableCell className="font-medium">{invoice.id.replace('ORD', 'INV')}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{new Date(invoice.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                            <Badge variant={invoice.status === 'Fulfilled' ? 'default' : invoice.status === 'Pending' ? 'secondary' : 'destructive'} className="capitalize">{invoice.status}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${invoice.balanceDue && invoice.balanceDue > 0 ? 'text-red-600' : ''}`}>
                            ₹{formatNumber(invoice.balanceDue)}
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


export function InvoicesClient({ orders, customers: initialCustomers }: { orders: Order[], customers: Customer[] }) {
    const [allInvoices, setAllInvoices] = useState<Order[]>(orders);
    const [allCustomers, setAllCustomers] = useState<Customer[]>(initialCustomers);
    const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);
    const [receiptToPrint, setReceiptToPrint] = useState<{order: Order, payment: Payment, historicalPayments: Payment[]} | null>(null);
    const [isReceiptLoading, setIsReceiptLoading] = useState(false);
    const { toast } = useToast();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) {
            setLogoUrl(savedLogo);
        }
    }, []);

    const { fullPaidInvoices, creditInvoices } = useMemo(() => {
        const fullPaid = allInvoices.filter(order => order.paymentTerm === 'Full Payment' && order.balanceDue === 0);
        const credit = allInvoices.filter(order => order.paymentTerm === 'Credit' || (order.balanceDue && order.balanceDue > 0));
        return { fullPaidInvoices: fullPaid, creditInvoices: credit };
    }, [allInvoices]);
    
    const handleAddPayment = (payment: Omit<Payment, 'id'>) => {
        if (!selectedInvoice) return;

        const newPayment: Payment = { ...payment, id: `PAY-${Date.now()}` };
        
        const updatedInvoice: Order = {
            ...selectedInvoice,
            payments: [...(selectedInvoice.payments || []), newPayment].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()),
            balanceDue: (selectedInvoice.balanceDue || selectedInvoice.grandTotal) - newPayment.amount,
        };
        
        if (updatedInvoice.balanceDue <= 0) {
            updatedInvoice.balanceDue = 0;
            updatedInvoice.status = 'Fulfilled';
            updatedInvoice.paymentTerm = 'Full Payment'; // Move to full paid
        }

        const newAllInvoices = allInvoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv);
        
        setAllInvoices(newAllInvoices);
        setSelectedInvoice(updatedInvoice); // Keep sheet open with updated data
        toast({
            title: 'Payment Recorded',
            description: `₹${formatNumber(newPayment.amount)} payment for invoice ${updatedInvoice.id.replace('ORD','INV')} has been recorded.`,
        });
    };

    const handleGenerateReceipt = async (payment: Payment) => {
        if (!selectedInvoice || !selectedInvoice.payments) return;
        setIsReceiptLoading(true);

        const paymentDate = new Date(payment.paymentDate);
        const historicalPayments = selectedInvoice.payments
            .filter(p => new Date(p.paymentDate) <= paymentDate)
            .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

        setReceiptToPrint({ order: selectedInvoice, payment, historicalPayments });
    };

    useEffect(() => {
        if (receiptToPrint) {
            setTimeout(() => {
                handlePrintReceipt();
            }, 100);
        }
    }, [receiptToPrint]);

    const handlePrintReceipt = async () => {
        if (!receiptToPrint || !receiptRef.current) return;
        
        try {
            const canvas = await html2canvas(receiptRef.current, { scale: 3, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasAspectRatio = canvas.width / canvas.height;
            const pdfHeight = pdfWidth / canvasAspectRatio;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`receipt-${receiptToPrint.payment.id}.pdf`);

            toast({ title: 'Success', description: 'Receipt PDF has been downloaded.' });
        } catch (error) {
            console.error('Failed to generate receipt:', error);
            toast({ title: 'Error', description: 'Failed to generate receipt PDF.', variant: 'destructive'});
        } finally {
            setIsReceiptLoading(false);
            setReceiptToPrint(null);
        }
    };
    
    const customerForReceipt = useMemo(() => {
        if (!receiptToPrint) return null;
        return allCustomers.find(c => c.id === receiptToPrint.order.customerId) || null;
    }, [receiptToPrint, allCustomers]);


    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold">Invoices</h1>
            <Tabs defaultValue="credit">
                <TabsList>
                    <TabsTrigger value="credit">Credit Invoices</TabsTrigger>
                    <TabsTrigger value="full-paid">Full Paid Invoices</TabsTrigger>
                </TabsList>
                <TabsContent value="full-paid">
                    <InvoiceTable invoices={fullPaidInvoices} onRowClick={setSelectedInvoice} />
                </TabsContent>
                <TabsContent value="credit">
                    <InvoiceTable invoices={creditInvoices} onRowClick={setSelectedInvoice}/>
                </TabsContent>
            </Tabs>

            <Sheet open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                <SheetContent className="sm:max-w-lg w-[90vw] flex flex-col">
                    {selectedInvoice && (
                        <>
                        <SheetHeader>
                            <SheetTitle>Invoice: {selectedInvoice.id.replace('ORD','INV')}</SheetTitle>
                            <SheetDescription>
                                Manage payments for {selectedInvoice.customerName}.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Amount:</span>
                                <span>₹{formatNumber(selectedInvoice.grandTotal)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                                <span className="text-red-600">Balance Due:</span>
                                <span className="text-red-600">₹{formatNumber(selectedInvoice.balanceDue)}</span>
                            </div>

                            <Separator />
                            
                            {selectedInvoice.balanceDue && selectedInvoice.balanceDue > 0 && (
                                <PaymentForm 
                                    balanceDue={selectedInvoice.balanceDue || 0}
                                    onAddPayment={handleAddPayment} 
                                />
                            )}
                           

                            <Separator />

                            <div className="space-y-2">
                               <h4 className="font-medium">Payment History</h4>
                                <div className="space-y-4 max-h-[40vh] overflow-y-auto p-1">
                                    {(selectedInvoice.payments && selectedInvoice.payments.length > 0) ? (
                                        selectedInvoice.payments.map(payment => (
                                             <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-lg">
                                                <div>
                                                    <p className="font-medium">₹{formatNumber(payment.amount)}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString()} via {payment.method}</p>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => handleGenerateReceipt(payment)} disabled={isReceiptLoading}>
                                                    {isReceiptLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                                                    <span>Receipt</span>
                                                </Button>
                                             </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
            
            {receiptToPrint && customerForReceipt && (
                <div style={{ position: 'fixed', left: '-200vw', top: 0, zIndex: -1 }}>
                    <ReceiptTemplate 
                        ref={receiptRef}
                        order={receiptToPrint.order}
                        customer={customerForReceipt}
                        payment={receiptToPrint.payment}
                        historicalPayments={receiptToPrint.historicalPayments}
                        logoUrl={logoUrl}
                    />
                </div>
            )}
        </div>
    );
}


function PaymentForm({ balanceDue, onAddPayment }: { balanceDue: number; onAddPayment: (payment: Omit<Payment, 'id'>) => void }) {
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMode>('Cash');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        if (paymentAmount > balanceDue) {
            alert('Payment cannot be greater than the balance due.');
            return;
        }
        
        onAddPayment({
            amount: paymentAmount,
            paymentDate,
            method: paymentMethod,
            notes,
        });

        // Reset form
        setAmount('');
        setNotes('');
    };

    return (
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Record a Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount Received</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={formatNumber(balanceDue)} max={balanceDue} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="paymentDate">Payment Date</Label>
                            <Input id="paymentDate" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="paymentMethod">Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMode)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Online Transfer">Online Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Cheque No. 12345" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full">Record Payment</Button>
                </CardFooter>
            </form>
        </Card>
    );
}

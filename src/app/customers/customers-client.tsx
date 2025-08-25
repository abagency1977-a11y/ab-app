
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Customer, Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, MoreHorizontal, ArrowUpDown, CreditCard, Loader2, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getOrders, getCustomers, addCustomer, deleteCustomer as deleteCustomerFromDB, updateCustomer, updateOrder } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { allocateBulkPayment, AllocateBulkPaymentOutput } from '@/ai/flows/allocate-bulk-payment';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);

type SortKey = keyof Customer | 'transactionHistory.totalSpent';

function AddCustomerDialog({ isOpen, onOpenChange, onCustomerAdded }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCustomerAdded: (customer: Customer) => void;
}) {
    const nameRef = useRef<HTMLInputElement>(null);
    const phoneRef = useRef<HTMLInputElement>(null);
    const addressRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleAddCustomer = async () => {
        const newCustomerData = {
            name: nameRef.current?.value || '',
            phone: phoneRef.current?.value || '',
            address: addressRef.current?.value || '',
        };

        if (!newCustomerData.name) {
            toast({
                title: "Validation Error",
                description: "Customer name is required.",
                variant: 'destructive',
            });
            return;
        }

        try {
            const newCustomerFromDB = await addCustomer(newCustomerData);
            onCustomerAdded(newCustomerFromDB);
            onOpenChange(false);
            toast({
                title: "Customer Added",
                description: `${newCustomerFromDB.name} has been successfully added.`,
            });
        } catch (error) {
            console.error("Failed to add customer:", error);
            toast({
                title: "Error",
                description: "Failed to add customer. Please try again.",
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to add a new customer to the system.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" ref={nameRef} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input id="phone" name="phone" ref={phoneRef} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">Address</Label>
                        <Input id="address" name="address" ref={addressRef} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={handleAddCustomer}>Save Customer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditCustomerDialog({ isOpen, onOpenChange, onCustomerUpdated, customer }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCustomerUpdated: (customer: Customer) => void;
    customer: Customer | null;
}) {
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<Customer>>({});

    useEffect(() => {
        if (customer) {
            setFormData(customer);
        }
    }, [customer]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateCustomer = async () => {
        if (!customer) return;
        
        try {
            const updatedCustomerData = { ...customer, ...formData };
            await updateCustomer(updatedCustomerData);
            onCustomerUpdated(updatedCustomerData);
            onOpenChange(false);
            toast({
                title: "Customer Updated",
                description: `${updatedCustomerData.name} has been successfully updated.`,
            });
        } catch (error) {
            console.error("Failed to update customer:", error);
            toast({
                title: "Error",
                description: "Failed to update customer. Please try again.",
                variant: 'destructive',
            });
        }
    };

    if (!customer) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Customer: {customer.name}</DialogTitle>
                    <DialogDescription>
                        Update the customer details below.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input id="phone" name="phone" value={formData.phone || ''} onChange={handleChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">Address</Label>
                        <Input id="address" name="address" value={formData.address || ''} onChange={handleChange} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={handleUpdateCustomer}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CustomersClient({ customers: initialCustomers }: { customers: Customer[] }) {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [orders, setOrders] = useState<Order[]>([]);
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);
    const [customerForBulkPayment, setCustomerForBulkPayment] = useState<Customer | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const { toast } = useToast();

     useEffect(() => {
        setIsMounted(true);
        getOrders().then(setOrders);
    }, []);

    const refreshData = async () => {
        const [refreshedCustomers, refreshedOrders] = await Promise.all([
            getCustomers(),
            getOrders()
        ]);
        setCustomers(refreshedCustomers);
        setOrders(refreshedOrders);
    };

    const sortedCustomers = useMemo(() => {
        let sortableItems = [...customers];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'transactionHistory.totalSpent') {
                    aValue = a.transactionHistory.totalSpent;
                    bValue = b.transactionHistory.totalSpent;
                } else {
                    aValue = a[sortConfig.key as keyof Customer];
                    bValue = b[sortConfig.key as keyof Customer];
                }

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
    }, [customers, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const filteredCustomers = sortedCustomers.filter(customer =>
        customer.name.toLowerCase().includes(search.toLowerCase())
    );
    
    const handleCustomerAdded = (newCustomer: Customer) => {
        setCustomers(prevCustomers => [...prevCustomers, newCustomer]);
    };
    
    const handleCustomerUpdated = (updatedCustomer: Customer) => {
        setCustomers(prevCustomers => prevCustomers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    };

    const handleDeleteCustomer = async () => {
        if (!customerToDelete || !customerToDelete.id) return;
        try {
            await deleteCustomerFromDB(customerToDelete.id);
            const newCustomers = customers.filter(c => c.id !== customerToDelete.id);
            setCustomers(newCustomers);
            setCustomerToDelete(null);
            toast({
                title: "Customer Deleted",
                description: `${customerToDelete.name} has been removed.`,
                variant: "destructive"
            });
        } catch(e) {
             toast({
                title: "Error deleting customer",
                description: "Could not delete customer.",
                variant: "destructive"
            });
        }
    };
    
    const openBulkPaymentDialog = (customer: Customer) => {
        const customerOrders = orders
            .filter(o => o.customerId === customer.id && (o.balanceDue ?? 0) > 0)
            .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()); // oldest first
        setCustomerForBulkPayment({ ...customer, orders: customerOrders });
        setIsBulkPaymentOpen(true);
    };

    if (!isMounted) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex items-center">
                    <Skeleton className="h-10 w-full max-w-sm" />
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-bold">Customers</h1>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
                </Button>
            </div>
            <div className="flex items-center">
                <Input
                    placeholder="Search customers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('name')}>
                                    Customer <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>
                               <Button variant="ghost" onClick={() => requestSort('transactionHistory.totalSpent')}>
                                    Total Ordered <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                             <TableHead>Last Purchase</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell className="font-medium">{customer.name}</TableCell>
                                <TableCell>
                                    <div className="text-sm text-muted-foreground">{customer.phone}</div>
                                </TableCell>
                                <TableCell>
                                    {formatNumber(customer.transactionHistory.totalSpent)}
                                </TableCell>
                                <TableCell>{new Date(customer.transactionHistory.lastPurchaseDate).toLocaleDateString('en-IN')}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setCustomerToEdit(customer); setIsEditDialogOpen(true); }}>Edit</DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/customers/${customer.id}`}>View Details</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openBulkPaymentDialog(customer)}>
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                Record Bulk Payment
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setCustomerToDelete(customer)} className="text-red-600">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            {/* Mobile Card View */}
            <div className="grid gap-4 md:hidden">
                {filteredCustomers.map((customer) => (
                    <Card key={customer.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle>{customer.name}</CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                         <DropdownMenuItem onClick={() => { setCustomerToEdit(customer); setIsEditDialogOpen(true); }}>Edit</DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/customers/${customer.id}`}>View Details</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openBulkPaymentDialog(customer)}>
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Record Bulk Payment
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setCustomerToDelete(customer)} className="text-red-600">Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{customer.phone || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <div className="text-sm">
                                    <p className="font-medium">Total Ordered</p>
                                    <p className="font-bold">{formatNumber(customer.transactionHistory.totalSpent)}</p>
                                </div>
                                <div className="text-sm text-right">
                                    <p className="font-medium">Last Purchase</p>
                                    <p>{new Date(customer.transactionHistory.lastPurchaseDate).toLocaleDateString('en-IN')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>


            <AddCustomerDialog 
                isOpen={isAddDialogOpen} 
                onOpenChange={setIsAddDialogOpen} 
                onCustomerAdded={handleCustomerAdded} 
            />
            
            <EditCustomerDialog 
                isOpen={isEditDialogOpen} 
                onOpenChange={setIsEditDialogOpen}
                onCustomerUpdated={handleCustomerUpdated}
                customer={customerToEdit}
            />

            <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the customer "{customerToDelete?.name}".
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCustomer}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {isBulkPaymentOpen && (
                <BulkPaymentDialog 
                    isOpen={isBulkPaymentOpen} 
                    onOpenChange={setIsBulkPaymentOpen}
                    customer={customerForBulkPayment}
                    onPaymentSuccess={refreshData}
                />
            )}
        </div>
    );
}


function BulkPaymentDialog({ isOpen, onOpenChange, customer, onPaymentSuccess }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    customer: (Customer & { orders?: Order[] }) | null;
    onPaymentSuccess: () => void;
}) {
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [notes, setNotes] = useState('');
    const [selectedInvoices, setSelectedInvoices] = useState<Record<string, boolean>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const outstandingInvoices = useMemo(() => customer?.orders ?? [], [customer]);
    
    const { totalSelected, remainingToAllocate } = useMemo(() => {
        const paymentAmount = parseFloat(amount) || 0;
        let totalSelected = 0;
        for (const invoiceId in selectedInvoices) {
            if (selectedInvoices[invoiceId]) {
                const invoice = outstandingInvoices.find(inv => inv.id === invoiceId);
                if (invoice) {
                    totalSelected += invoice.balanceDue ?? 0;
                }
            }
        }
        return { totalSelected, remainingToAllocate: paymentAmount - totalSelected };
    }, [selectedInvoices, outstandingInvoices, amount]);

    const handleSelectInvoice = (invoiceId: string, isChecked: boolean) => {
        setSelectedInvoices(prev => ({ ...prev, [invoiceId]: isChecked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer) return;
        
        setIsProcessing(true);
        try {
            const paymentAmount = parseFloat(amount);
            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                throw new Error("Please enter a valid payment amount.");
            }

            const invoicesToPay = outstandingInvoices.filter(inv => selectedInvoices[inv.id]);
            if (invoicesToPay.length === 0) {
                throw new Error("Please select at least one invoice to pay.");
            }
            
            const totalAmountOfSelectedInvoices = invoicesToPay.reduce((sum, inv) => sum + (inv.balanceDue ?? 0), 0);
            if (paymentAmount > totalAmountOfSelectedInvoices) {
                 toast({
                    title: "Payment amount too high",
                    description: `Payment of ${formatNumber(paymentAmount)} is more than the selected invoices total of ${formatNumber(totalAmountOfSelectedInvoices)}.`,
                    variant: 'destructive',
                });
                setIsProcessing(false);
                return;
            }

            const result = await allocateBulkPayment({
                customerId: customer.id,
                paymentAmount,
                paymentDate,
                paymentMethod,
                notes,
                invoicesToPay: invoicesToPay.map(o => ({
                    id: o.id,
                    orderDate: o.orderDate,
                    balanceDue: o.balanceDue ?? o.grandTotal,
                    grandTotal: o.grandTotal,
                })),
            });
            
            toast({
                title: "Bulk Payment Successful",
                description: result.summary,
            });

            onPaymentSuccess();
            onOpenChange(false);

        } catch (error: any) {
            console.error("Bulk payment error:", error);
            toast({
                title: "Allocation Failed",
                description: error.message || "Could not process the bulk payment.",
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!customer) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Record Bulk Payment for {customer.name}</DialogTitle>
                    <DialogDescription>
                        Enter payment details and select which invoices to apply it to.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bulk-amount">Amount Received</Label>
                                <Input id="bulk-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bulk-paymentDate">Payment Date</Label>
                                <Input id="bulk-paymentDate" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bulk-paymentMethod">Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
                             <div className="space-y-2">
                                <Label htmlFor="bulk-notes">Notes (Optional)</Label>
                                <Input id="bulk-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Consolidated payment" />
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-medium my-2">Outstanding Invoices</h4>
                            <ScrollArea className="h-64 border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead>Invoice ID</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Balance Due</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {outstandingInvoices.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedInvoices[inv.id]}
                                                        onCheckedChange={(checked) => handleSelectInvoice(inv.id, !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell>{inv.id.replace("ORD", "INV")}</TableCell>
                                                <TableCell>{new Date(inv.orderDate).toLocaleDateString('en-IN')}</TableCell>
                                                <TableCell className="text-right">{formatNumber(inv.balanceDue ?? 0)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                         <div className="grid grid-cols-2 gap-4 text-sm mt-2 p-3 bg-muted rounded-md">
                            <div>Total Selected: <Badge variant="secondary">{formatNumber(totalSelected)}</Badge></div>
                            <div className={remainingToAllocate < 0 ? 'text-red-600' : ''}>
                                {remainingToAllocate < 0 ? 'Over Allocated:' : 'Remaining:'} <Badge variant={remainingToAllocate < 0 ? 'destructive' : 'default'}>{formatNumber(Math.abs(remainingToAllocate))}</Badge>
                            </div>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isProcessing || Object.values(selectedInvoices).every(v => !v)}>
                             {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Allocate Payment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

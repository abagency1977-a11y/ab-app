
'use client';

import React, { useState, useMemo } from 'react';
import type { Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, MoreHorizontal, ArrowUpDown, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value);

type SortKey = keyof Customer | 'transactionHistory.totalSpent';

export function CustomersClient({ customers: initialCustomers }: { customers: Customer[] }) {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);
    const [customerForBulkPayment, setCustomerForBulkPayment] = useState<Customer | null>(null);
    const { toast } = useToast();

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
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase())
    );
    
    const handleAddCustomer = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newCustomer: Customer = {
            id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            address: formData.get('address') as string,
            transactionHistory: { totalSpent: 0, lastPurchaseDate: new Date().toISOString().split('T')[0] },
        };
        // Here you would typically make an API call to save the new customer to your backend.
        // For this prototype, we'll just add it to the local state.
        setCustomers(prev => [...prev, newCustomer]);
        setIsAddDialogOpen(false);
        toast({
            title: "Customer Added",
            description: `${newCustomer.name} has been successfully added.`,
        });
    };

    const handleDeleteCustomer = () => {
        if (!customerToDelete) return;

        setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
        setCustomerToDelete(null);
        toast({
            title: "Customer Deleted",
            description: `${customerToDelete.name} has been removed.`,
            variant: "destructive"
        });
    };
    
    const openBulkPaymentDialog = (customer: Customer) => {
        setCustomerForBulkPayment(customer);
        setIsBulkPaymentOpen(true);
    };


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
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
            <div className="rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('name')}>
                                    Customer <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>
                               <Button variant="ghost" onClick={() => requestSort('transactionHistory.totalSpent')}>
                                    Total Spent <ArrowUpDown className="ml-2 h-4 w-4" />
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
                                    <div className="text-sm">{customer.email}</div>
                                    <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                </TableCell>
                                <TableCell>
                                    ₹{formatNumber(customer.transactionHistory.totalSpent)}
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
                                            <DropdownMenuItem>Edit</DropdownMenuItem>
                                            <DropdownMenuItem>View Details</DropdownMenuItem>
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

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                        <DialogDescription>
                            Fill in the details below to add a new customer to the system.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCustomer}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" name="name" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" name="email" type="email" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">Phone</Label>
                                <Input id="phone" name="phone" className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="address" className="text-right">Address</Label>
                                <Input id="address" name="address" className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Customer</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
            
            <BulkPaymentDialog 
                isOpen={isBulkPaymentOpen} 
                onOpenChange={setIsBulkPaymentOpen}
                customer={customerForBulkPayment}
            />
        </div>
    );
}


function BulkPaymentDialog({ isOpen, onOpenChange, customer }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    customer: Customer | null;
}) {
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [notes, setNotes] = useState('');
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder for future logic
        toast({
            title: "Feature In Progress",
            description: "Bulk payment allocation logic is not yet implemented.",
        });
        onOpenChange(false);
    };

    if (!customer) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Bulk Payment for {customer.name}</DialogTitle>
                    <DialogDescription>
                        Enter the total payment received. It will be automatically allocated to the oldest outstanding invoices first.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="bulk-amount">Amount Received</Label>
                            <Input id="bulk-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bulk-paymentDate">Payment Date</Label>
                                <Input id="bulk-paymentDate" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                            </div>
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
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bulk-notes">Notes (Optional)</Label>
                            <Input id="bulk-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Consolidated payment" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Allocate Payment</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

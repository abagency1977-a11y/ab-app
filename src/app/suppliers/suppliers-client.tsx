
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Supplier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, MoreHorizontal, Mail, Phone, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addSupplier, deleteSupplier as deleteSupplierFromDB, updateSupplier } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function SupplierDialog({
    isOpen,
    onOpenChange,
    onSupplierSaved,
    existingSupplier
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSupplierSaved: (supplier: Supplier) => void;
    existingSupplier?: Supplier | null;
}) {
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<Supplier>>({});

    const isEditMode = !!existingSupplier;

    useEffect(() => {
        if (existingSupplier) {
            setFormData(existingSupplier);
        } else {
            setFormData({});
        }
    }, [existingSupplier]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.email) {
            toast({
                title: "Validation Error",
                description: "Supplier name and email are required.",
                variant: 'destructive',
            });
            return;
        }

        try {
            let savedSupplier: Supplier;
            if (isEditMode && existingSupplier) {
                const updatedSupplierData = { ...existingSupplier, ...formData };
                await updateSupplier(updatedSupplierData);
                savedSupplier = updatedSupplierData;
            } else {
                savedSupplier = await addSupplier(formData as Omit<Supplier, 'id'>);
            }
            
            onSupplierSaved(savedSupplier);
            onOpenChange(false);
            toast({
                title: isEditMode ? "Supplier Updated" : "Supplier Added",
                description: `${savedSupplier.name} has been successfully saved.`,
            });
        } catch (error) {
            console.error("Failed to save supplier:", error);
            toast({
                title: "Error",
                description: "Failed to save supplier. Please try again.",
                variant: 'destructive',
            });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? `Edit Supplier: ${existingSupplier?.name}` : 'Add New Supplier'}</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the supplier.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" required />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contactPerson" className="text-right">Contact Person</Label>
                        <Input id="contactPerson" name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" name="email" value={formData.email || ''} onChange={handleChange} type="email" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input id="phone" name="phone" value={formData.phone || ''} onChange={handleChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">Address</Label>
                        <Input id="address" name="address" value={formData.address || ''} onChange={handleChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="gstin" className="text-right">GSTIN</Label>
                        <Input id="gstin" name="gstin" value={formData.gstin || ''} onChange={handleChange} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={handleSubmit}>Save Supplier</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export function SuppliersClient({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
    const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const { toast } = useToast();

     useEffect(() => {
        setIsMounted(true);
    }, []);
    
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(search.toLowerCase()) ||
            (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
            supplier.email.toLowerCase().includes(search.toLowerCase())
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [suppliers, search]);

    const handleSupplierSaved = (savedSupplier: Supplier) => {
        if (suppliers.some(s => s.id === savedSupplier.id)) {
            setSuppliers(prevSuppliers => prevSuppliers.map(s => s.id === savedSupplier.id ? savedSupplier : s));
        } else {
            setSuppliers(prevSuppliers => [...prevSuppliers, savedSupplier]);
        }
    };
    
    const handleDeleteSupplier = async () => {
        if (!supplierToDelete || !supplierToDelete.id) return;
        try {
            await deleteSupplierFromDB(supplierToDelete.id);
            const newSuppliers = suppliers.filter(c => c.id !== supplierToDelete.id);
            setSuppliers(newSuppliers);
            setSupplierToDelete(null);
            toast({
                title: "Supplier Deleted",
                description: `${supplierToDelete.name} has been removed.`,
                variant: "destructive"
            });
        } catch(e) {
             toast({
                title: "Error deleting supplier",
                description: "Could not delete supplier.",
                variant: "destructive"
            });
        }
    };
    
    const openDialog = (supplier?: Supplier) => {
        setSupplierToEdit(supplier || null);
        setIsDialogOpen(true);
    }

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
                <h1 className="text-3xl font-bold">Suppliers</h1>
                <Button onClick={() => openDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
                </Button>
            </div>
            <div className="flex items-center">
                <Input
                    placeholder="Search suppliers..."
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
                            <TableHead>Supplier</TableHead>
                            <TableHead>Contact Person</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSuppliers.map((supplier) => (
                            <TableRow key={supplier.id}>
                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
                                <TableCell>{supplier.email}</TableCell>
                                <TableCell>{supplier.phone}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openDialog(supplier)}>Edit</DropdownMenuItem>
                                            {/* <DropdownMenuItem asChild>
                                                <Link href={`/suppliers/${supplier.id}`}>View Details</Link>
                                            </DropdownMenuItem> */}
                                            <DropdownMenuItem onClick={() => setSupplierToDelete(supplier)} className="text-red-600">Delete</DropdownMenuItem>
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
                {filteredSuppliers.map((supplier) => (
                    <Card key={supplier.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle>{supplier.name}</CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openDialog(supplier)}>Edit</DropdownMenuItem>
                                        {/* <DropdownMenuItem asChild>
                                            <Link href={`/suppliers/${supplier.id}`}>View Details</Link>
                                        </DropdownMenuItem> */}
                                        <DropdownMenuItem onClick={() => setSupplierToDelete(supplier)} className="text-red-600">Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CardDescription>{supplier.address}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>{supplier.contactPerson || 'No contact person'}</span>
                            </div>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span>{supplier.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>{supplier.phone || 'N/A'}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>


            <SupplierDialog 
                isOpen={isDialogOpen} 
                onOpenChange={setIsDialogOpen}
                onSupplierSaved={handleSupplierSaved}
                existingSupplier={supplierToEdit}
            />

            <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the supplier "{supplierToDelete?.name}". Any purchases associated with this supplier will NOT be deleted.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSupplier}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

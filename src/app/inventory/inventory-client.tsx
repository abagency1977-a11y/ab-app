
'use client';

import React, { useState } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { predictProductDemand, PredictProductDemandOutput } from '@/ai/flows/predict-product-demand';
import { Lightbulb, Loader2, PlusCircle, MoreHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

export function InventoryClient({ products: initialProducts }: { products: Product[] }) {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [selectedProduct, setSelectedProduct] = useState<string | undefined>(products[0]?.id);
    const [prediction, setPrediction] = useState<PredictProductDemandOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const { toast } = useToast();

    const handlePredictDemand = async () => {
        if (!selectedProduct) {
            setError('Please select a product.');
            return;
        }
        
        const product = products.find(p => p.id === selectedProduct);
        if (!product || !product.historicalData) {
            setError('Selected product has no historical data for prediction.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setPrediction(null);

        try {
            const result = await predictProductDemand({
                productName: product.name,
                historicalOrderData: JSON.stringify(product.historicalData),
            });
            setPrediction(result);
        } catch (e) {
            setError('An error occurred while predicting demand.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddProduct = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newProduct: Product = {
            id: `PROD-${String(products.length + 1).padStart(3, '0')}`,
            name: formData.get('name') as string,
            sku: formData.get('sku') as string,
            stock: Number(formData.get('stock')),
            location: '',
            price: Number(formData.get('price')),
            historicalData: [],
        };

        setProducts(prev => [...prev, newProduct]);
        setIsAddDialogOpen(false);
        toast({
            title: "Product Added",
            description: `${newProduct.name} has been successfully added to inventory.`,
        });
    };

    const handleEditProduct = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!productToEdit) return;

        const formData = new FormData(event.currentTarget);
        const updatedProduct: Product = {
            ...productToEdit,
            name: formData.get('name') as string,
            sku: formData.get('sku') as string,
            stock: Number(formData.get('stock')),
            price: Number(formData.get('price')),
        };

        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        setIsEditDialogOpen(false);
        setProductToEdit(null);
        toast({
            title: "Product Updated",
            description: `${updatedProduct.name} has been successfully updated.`,
        });
    };

    const handleDeleteProduct = () => {
        if (!productToDelete) return;

        setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
        setProductToDelete(null);
        toast({
            title: "Product Deleted",
            description: `${productToDelete.name} has been removed from inventory.`,
            variant: "destructive"
        });
    };
    
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Inventory</h1>
                 <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-lg border shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.sku}</TableCell>
                                        <TableCell>{product.stock}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => { setProductToEdit(product); setIsEditDialogOpen(true); }}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setProductToDelete(product)} className="text-red-600">Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div className="lg:col-span-1">
                     <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle>Predict Product Demand</CardTitle>
                            <CardDescription>Use AI to predict how much product is needed based on historical orders.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select onValueChange={setSelectedProduct} defaultValue={selectedProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(product => (
                                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                            {prediction && (
                                <Alert>
                                    <Lightbulb className="h-4 w-4" />
                                    <AlertTitle>Prediction Result</AlertTitle>
                                    <AlertDescription>
                                        <p className="font-bold text-lg">Predicted Demand: {prediction.predictedDemand} units</p>
                                        <p className="mt-2 text-sm">{prediction.rationale}</p>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handlePredictDemand} disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? 'Predicting...' : 'Predict Demand'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                        <DialogDescription>
                            Fill in the details below to add a new product to the inventory.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddProduct}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" name="name" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sku" className="text-right">SKU</Label>
                                <Input id="sku" name="sku" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock" className="text-right">Stock</Label>
                                <Input id="stock" name="stock" type="number" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Price</Label>
                                <Input id="price" name="price" type="number" step="0.01" className="col-span-3" required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Product</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                        <DialogDescription>
                            Update the details for {productToEdit?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditProduct}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" name="name" className="col-span-3" defaultValue={productToEdit?.name} required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sku" className="text-right">SKU</Label>
                                <Input id="sku" name="sku" className="col-span-3" defaultValue={productToEdit?.sku} required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock" className="text-right">Stock</Label>
                                <Input id="stock" name="stock" type="number" className="col-span-3" defaultValue={productToEdit?.stock} required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Price</Label>
                                <Input id="price" name="price" type="number" step="0.01" className="col-span-3" defaultValue={productToEdit?.price} required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setProductToEdit(null);}}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the product "{productToDelete?.name}".
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProduct}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );

    
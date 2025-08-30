
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Product, CalculationType, ProductCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { predictProductDemand, PredictProductDemandOutput } from '@/ai/flows/predict-product-demand';
import { Lightbulb, Loader2, PlusCircle, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addProduct, deleteProduct as deleteProductFromDB, getProducts, updateProduct } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);

function AddProductDialog({ isOpen, onOpenChange, onProductAdded }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onProductAdded: (product: Product) => void;
}) {
    const nameRef = useRef<HTMLInputElement>(null);
    const skuRef = useRef<HTMLInputElement>(null);
    const stockRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const costRef = useRef<HTMLInputElement>(null);
    const gstRef = useRef<HTMLInputElement>(null);
    const reorderPointRef = useRef<HTMLInputElement>(null);
    const brandRef = useRef<HTMLInputElement>(null);
    const [calculationType, setCalculationType] = useState<CalculationType>('Per Unit');
    const [category, setCategory] = useState<ProductCategory>('General');
    const { toast } = useToast();

    const handleAddProduct = async () => {
        const newProductData: Omit<Product, 'id' | 'historicalData'> = {
            name: nameRef.current?.value || '',
            sku: skuRef.current?.value || '',
            stock: Number(stockRef.current?.value || 0),
            price: Number(priceRef.current?.value || 0),
            cost: Number(costRef.current?.value || 0),
            gst: Number(gstRef.current?.value || 0),
            reorderPoint: Number(reorderPointRef.current?.value || 0),
            calculationType: calculationType,
            category: category,
            brand: category === 'Red Bricks' ? brandRef.current?.value : undefined,
        };

        if (!newProductData.name || !newProductData.sku) {
             toast({
                title: "Validation Error",
                description: "Product name and SKU are required.",
                variant: 'destructive',
            });
            return;
        }

        try {
            const newProductFromDB = await addProduct(newProductData);
            const completeNewProduct: Product = {
                ...newProductFromDB,
                historicalData: []
            };
            onProductAdded(completeNewProduct);
            onOpenChange(false);
            toast({
                title: "Product Added",
                description: `${newProductFromDB.name} has been successfully added to inventory.`,
            });
        } catch(e) {
             console.error("Failed to add product:", e);
             toast({
                title: "Error",
                description: "Failed to add product. Please try again.",
                variant: 'destructive'
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to add a new product to the inventory.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" ref={nameRef} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sku" className="text-right">SKU</Label>
                        <Input id="sku" name="sku" ref={skuRef} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">Stock</Label>
                        <Input id="stock" name="stock" ref={stockRef} type="number" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Sale Price</Label>
                        <Input id="price" name="price" ref={priceRef} type="number" step="0.01" className="col-span-3" required />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cost" className="text-right">Cost Price</Label>
                        <Input id="cost" name="cost" ref={costRef} type="number" step="0.01" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="gst" className="text-right">GST %</Label>
                        <Input id="gst" name="gst" ref={gstRef} type="number" step="0.01" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reorderPoint" className="text-right">Reorder Point</Label>
                        <Input id="reorderPoint" name="reorderPoint" ref={reorderPointRef} type="number" className="col-span-3" defaultValue="0" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="calculationType" className="text-right">Calculation Type</Label>
                         <Select value={calculationType} onValueChange={(v) => setCalculationType(v as CalculationType)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select calculation type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Per Unit">Per Unit</SelectItem>
                                <SelectItem value="Per Kg">Per Kg</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                         <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="General">General</SelectItem>
                                <SelectItem value="Red Bricks">Red Bricks</SelectItem>
                                <SelectItem value="Rods & Rings">Rods & Rings</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {category === 'Red Bricks' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="brand" className="text-right">Brand</Label>
                            <Input id="brand" name="brand" ref={brandRef} className="col-span-3" placeholder="e.g., KKP, ABC" />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={handleAddProduct}>Add Product</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export function InventoryClient({ products: initialProducts }: { products: Product[] }) {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [selectedProduct, setSelectedProduct] = useState<string | undefined>(initialProducts[0]?.id);
    const [prediction, setPrediction] = useState<PredictProductDemandOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter(product => 
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, searchQuery]);

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
    
    const refreshProducts = async () => {
        const freshProducts = await getProducts();
        setProducts(freshProducts);
    }

    const handleProductAdded = (newProduct: Product) => {
        setProducts(prevProducts => [...prevProducts, newProduct]);
    };


    const handleEditProduct = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!productToEdit) return;

        const formData = new FormData(event.currentTarget);
        const updatedProduct: Product = {
            ...productToEdit,
            name: formData.get('name') as string,
            sku: formData.get('sku') as string,
            stock: Number(formData.get('stock')),
            price: Number(formData.get('price')),
            cost: Number(formData.get('cost')),
            gst: Number(formData.get('gst')),
            reorderPoint: Number(formData.get('reorderPoint')),
            calculationType: formData.get('calculationType') as CalculationType || 'Per Unit',
            category: formData.get('category') as ProductCategory || 'General',
            brand: formData.get('category') === 'Red Bricks' ? formData.get('brand') as string : undefined,
        };

        try {
            await updateProduct(updatedProduct);
            const newProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
            setProducts(newProducts);
            
            setIsEditDialogOpen(false);
            setProductToEdit(null);
            toast({
                title: "Product Updated",
                description: `${updatedProduct.name} has been successfully updated.`,
            });

        } catch (e) {
             toast({
                title: "Error Updating Product",
                description: "Could not save changes to the product.",
                variant: 'destructive',
            });
        }
    };

    const handleDeleteProduct = async () => {
        if (!productToDelete || !productToDelete.id) return;
        try {
            await deleteProductFromDB(productToDelete.id);
            const newProducts = products.filter(p => p.id !== productToDelete.id);
            setProducts(newProducts);
            setProductToDelete(null);
            toast({
                title: "Product Deleted",
                description: `${productToDelete.name} has been removed from inventory.`,
                variant: "destructive"
            });
        } catch(e) {
            toast({
                title: "Error",
                description: "Failed to delete product.",
                variant: "destructive"
            });
        }
    };

    if (!isMounted) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="rounded-lg border shadow-sm p-4">
                            <Skeleton className="h-8 w-full mb-4" />
                            <Skeleton className="h-8 w-full mb-2" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-10 w-full" />
                            </CardContent>
                            <CardFooter>
                                <Skeleton className="h-10 w-full" />
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-bold">Inventory</h1>
                 <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                </Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center">
                        <Input
                            placeholder="Search by product name or SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-lg border shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Reorder Point</TableHead>
                                    <TableHead className="text-right">Sale Price</TableHead>
                                    <TableHead className="text-right">Cost Price</TableHead>
                                    <TableHead>GST %</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((product) => {
                                    const isLowStock = product.stock <= (product.reorderPoint ?? 0);
                                    return (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name} {product.brand && <span className="text-muted-foreground text-xs">({product.brand})</span>}</TableCell>
                                            <TableCell>{product.sku}</TableCell>
                                            <TableCell><Badge variant="secondary">{product.category || 'General'}</Badge></TableCell>
                                            <TableCell className={cn(isLowStock && "text-destructive font-bold")}>
                                                <div className="flex items-center gap-2">
                                                    {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                                    {product.stock}
                                                </div>
                                            </TableCell>
                                            <TableCell>{product.reorderPoint ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(product.price)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(product.cost)}
                                            </TableCell>
                                            <TableCell>{product.gst}%</TableCell>
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
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="grid md:hidden gap-4">
                        {filteredProducts.map((product) => {
                            const isLowStock = product.stock <= (product.reorderPoint ?? 0);
                             return (
                                <Card key={product.id} className={cn(isLowStock && "border-destructive")}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle>{product.name} {product.brand && <span className="text-muted-foreground text-sm">({product.brand})</span>}</CardTitle>
                                                <CardDescription>SKU: {product.sku}</CardDescription>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 -mt-2 -mr-2">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => { setProductToEdit(product); setIsEditDialogOpen(true); }}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setProductToDelete(product)} className="text-red-600">Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Stock</p>
                                                <p className={cn("font-bold", isLowStock && "text-destructive")}>{product.stock}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Reorder</p>
                                                <p className="font-bold">{product.reorderPoint ?? 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Sale Price</p>
                                                <p className="font-bold">{formatNumber(product.price)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Cost Price</p>
                                                <p className="font-bold">{formatNumber(product.cost)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">GST</p>
                                                <p className="font-bold">{product.gst}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Category</p>
                                                <p className="font-bold">{product.category || 'General'}</p>
                                            </div>
                                        </div>
                                         <div>
                                            <p className="text-xs text-muted-foreground">Calculation Type</p>
                                            <p className="font-bold">{product.calculationType === 'Per Kg' ? 'Per Kilogram' : 'Per Unit'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
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

            <AddProductDialog 
                isOpen={isAddDialogOpen} 
                onOpenChange={setIsAddDialogOpen} 
                onProductAdded={handleProductAdded}
            />

             <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
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
                                <Label htmlFor="reorderPoint" className="text-right">Reorder Point</Label>
                                <Input id="reorderPoint" name="reorderPoint" type="number" className="col-span-3" defaultValue={productToEdit?.reorderPoint} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Sale Price</Label>
                                <Input id="price" name="price" type="number" step="0.01" className="col-span-3" defaultValue={productToEdit?.price} required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cost" className="text-right">Cost Price</Label>
                                <Input id="cost" name="cost" type="number" step="0.01" className="col-span-3" defaultValue={productToEdit?.cost} required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="gst" className="text-right">GST %</Label>
                                <Input id="gst" name="gst" type="number" step="0.01" className="col-span-3" defaultValue={productToEdit?.gst} required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="calculationTypeEdit" className="text-right">Calculation Type</Label>
                                <Select name="calculationType" defaultValue={productToEdit?.calculationType || 'Per Unit'}>
                                    <SelectTrigger id="calculationTypeEdit" className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Per Unit">Per Unit</SelectItem>
                                        <SelectItem value="Per Kg">Per Kg</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="categoryEdit" className="text-right">Category</Label>
                                <Select name="category" defaultValue={productToEdit?.category || 'General'}>
                                    <SelectTrigger id="categoryEdit" className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Red Bricks">Red Bricks</SelectItem>
                                        <SelectItem value="Rods & Rings">Rods & Rings</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             {productToEdit?.category === 'Red Bricks' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="brandEdit" className="text-right">Brand</Label>
                                    <Input id="brandEdit" name="brand" className="col-span-3" defaultValue={productToEdit?.brand} />
                                </div>
                            )}
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
}

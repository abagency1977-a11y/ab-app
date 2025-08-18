'use client';

import React, { useState } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { predictProductDemand, PredictProductDemandOutput } from '@/ai/flows/predict-product-demand';
import { Lightbulb, Loader2, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
            location: formData.get('location') as string,
            price: Number(formData.get('price')),
            historicalData: [],
        };

        // In a real app, this would be an API call.
        setProducts(prev => [...prev, newProduct]);
        setIsAddDialogOpen(false);
        toast({
            title: "Product Added",
            description: `${newProduct.name} has been successfully added to inventory.`,
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
                                    <TableHead>Location</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.sku}</TableCell>
                                        <TableCell>{product.stock}</TableCell>
                                        <TableCell>{product.location}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
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
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="location" className="text-right">Location</Label>
                                <Input id="location" name="location" className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Product</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

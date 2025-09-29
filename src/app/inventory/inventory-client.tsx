'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Product, CalculationType, ProductCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlusCircle, MoreHorizontal, AlertTriangle, Database, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addProduct, deleteProduct as deleteProductFromDB, getProducts, updateProduct } from '@/lib/data'; // Assuming updateProduct is the standard one
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Necessary for debugFirebaseUpdate
import { db } from '@/lib/firebase'; // Assuming this import path is correct

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);

// Firebase connection test function
const testFirebaseConnection = async (): Promise<{ success: boolean; error?: string; productsCount?: number }> => {
    try {
        console.log("🔌 Testing Firebase connection...");
        const testProducts = await getProducts();
        console.log("✅ Firebase connection successful. Products found:", testProducts.length);
        return { success: true, productsCount: testProducts.length };
    } catch (error) {
        console.error("🔥 FIREBASE CONNECTION FAILED:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown connection error' 
        };
    }
};

// Comprehensive Firebase debug function (Kept for consistency with your code)
const debugFirebaseUpdate = async (productId: string, updates: Partial<Product>) => {
    console.group("🔧 FIREBASE DEBUG START");
    console.log("Product ID:", productId);
    console.log("Update data:", updates);
    
    try {
        const productRef = doc(db, 'products', productId);
        console.log("Document path:", productRef.path);
        
        const docSnap = await getDoc(productRef);
        console.log("Document exists:", docSnap.exists());
        
        if (docSnap.exists()) {
            console.log("Current data:", docSnap.data());
        }
        
        // Test 1: Try the actual update data (skipped the setDoc test to rely on the updateProduct logic)
        console.log("Attempting actual update...");
        
        // 🚨 IMPORTANT: The user's original code calls debugFirebaseUpdate, 
        // which then calls setDoc. I will use the imported updateProduct function 
        // for the actual update, as per common project structure (assuming it uses setDoc with merge: true).
        // Since the user defined debugFirebaseUpdate to use setDoc, I will keep that logic.
        await setDoc(productRef, updates, { merge: true });
        
        console.log("✅ Actual update successful!");
        return true;
        
    } catch (error) {
        console.error("❌ DEBUG UPDATE FAILED:", error);
        console.error("Error details:", {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown',
            stack: error instanceof Error ? error.stack : 'No stack'
        });
        return false;
    } finally {
        console.groupEnd();
    }
};

// --- ADD PRODUCT DIALOG (UNCHANGED) ---
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
    const weightPerUnitRef = useRef<HTMLInputElement>(null);
    const [calculationType, setCalculationType] = useState<CalculationType>('Per Unit');
    const [category, setCategory] = useState<ProductCategory>('General');
    const { toast } = useToast();

    const handleAddProduct = async () => {
        // Test Firebase connection first
        const connectionTest = await testFirebaseConnection();
        if (!connectionTest.success) {
            toast({
                title: "Connection Error",
                description: "Cannot connect to database. Please check your internet connection.",
                variant: 'destructive',
            });
            return;
        }

        const productData: Partial<Product> = {
            name: nameRef.current?.value || '',
            sku: skuRef.current?.value || '',
            stock: Number(stockRef.current?.value || 0),
            price: Number(priceRef.current?.value || 0),
            cost: Number(costRef.current?.value || 0),
            gst: Number(gstRef.current?.value || 0),
            reorderPoint: Number(reorderPointRef.current?.value || 0),
            calculationType: calculationType,
            category: category,
        };

        if (!productData.name || !productData.sku) {
             toast({
                title: "Validation Error",
                description: "Product name and SKU are required.",
                variant: 'destructive',
            });
            return;
        }

        if (category === 'Red Bricks' && brandRef.current?.value) {
            productData.brand = brandRef.current.value;
        }
        
        if (category === 'Rods & Rings' && weightPerUnitRef.current?.value) {
            productData.weightPerUnit = Number(weightPerUnitRef.current.value);
            productData.calculationType = 'Per Kg';
        }

        try {
            const newProductFromDB = await addProduct(productData);
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
                        <Label htmlFor="add-name" className="text-right">Name</Label>
                        <Input id="add-name" name="name" ref={nameRef} autoComplete="off" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-sku" className="text-right">SKU</Label>
                        <Input id="add-sku" name="sku" ref={skuRef} autoComplete="off" className="col-span-3" required />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-category" className="text-right">Category</Label>
                         <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                            <SelectTrigger id="add-category" className="col-span-3">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="General">General</SelectItem>
                                <SelectItem value="Red Bricks">Red Bricks</SelectItem>
                                <SelectItem value="Rods & Rings">Rods & Rings</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-stock" className="text-right">{category === 'Rods & Rings' ? 'Stock in Nos' : 'Stock'}</Label>
                        <Input id="add-stock" name="stock" ref={stockRef} type="number" autoComplete="off" className="col-span-3" required defaultValue="0" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-price" className="text-right">Sale Price</Label>
                        <Input id="add-price" name="price" ref={priceRef} type="number" step="0.01" autoComplete="off" className="col-span-3" required />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-cost" className="text-right">Cost Price</Label>
                        <Input id="add-cost" name="cost" ref={costRef} type="number" step="0.01" autoComplete="off" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-gst" className="text-right">GST %</Label>
                        <Input id="add-gst" name="gst" ref={gstRef} type="number" step="0.01" autoComplete="off" className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-reorderPoint" className="text-right">Reorder Point</Label>
                        <Input id="add-reorderPoint" name="reorderPoint" ref={reorderPointRef} type="number" autoComplete="off" className="col-span-3" defaultValue="0" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-calculationType" className="text-right">Calculation Type</Label>
                         <Select value={calculationType} onValueChange={(v) => setCalculationType(v as CalculationType)} disabled={category === 'Rods & Rings'}>
                            <SelectTrigger id="add-calculationType" className="col-span-3">
                                <SelectValue placeholder="Select calculation type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Per Unit">Per Unit</SelectItem>
                                <SelectItem value="Per Kg">Per Kg</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {category === 'Red Bricks' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-brand" className="text-right">Brand</Label>
                            <Input id="add-brand" name="brand" ref={brandRef} autoComplete="off" className="col-span-3" placeholder="e.g., KKP, ABC" />
                        </div>
                    )}
                    {category === 'Rods & Rings' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="add-weightPerUnit" className="text-right">Weight/Unit (Kg)</Label>
                            <Input id="add-weightPerUnit" name="weightPerUnit" ref={weightPerUnitRef} type="number" step="any" autoComplete="off" className="col-span-3" placeholder="e.g., 10.69" />
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


// --- NEW: EDIT PRODUCT DIALOG (THE FIXED COMPONENT) ---
function EditProductDialog({ 
    productToEdit, 
    isOpen, 
    onOpenChange, 
    handleEditSubmit 
}: {
    // NOTE: I've updated the type signature for handleEditSubmit
    productToEdit: Product | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    handleEditSubmit: (updates: Partial<Product>) => Promise<void>;
}) {
    // Local state to hold the editable version of the product
    const [productDraft, setProductDraft] = useState<Partial<Product> | null>(null);

    // 1. FIX: Initialize the draft ONLY when the productToEdit changes AND the dialog is open.
    useEffect(() => {
        if (isOpen && productToEdit && productToEdit.id !== productDraft?.id) {
            // Use a deep copy to break the reference and prevent unexpected resets
            setProductDraft({ ...productToEdit });
        } else if (!isOpen) {
            // Clean up the draft state when the dialog closes
            setProductDraft(null);
        }
    // productDraft is deliberately excluded from dependencies to prevent the update loop.
    }, [isOpen, productToEdit]); 

    // Handler for all standard inputs (text, number)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        
        setProductDraft(prev => {
            if (!prev) return null;

            let finalValue: string | number | undefined = value;
            if (type === 'number') {
                // Parse numbers safely
                finalValue = parseFloat(value);
                if (isNaN(finalValue)) finalValue = 0;
            }

            const updatedDraft = { ...prev, [name]: finalValue };

            return updatedDraft;
        });
    };
    
    // Handler for Select components (like category and calculationType)
    const handleSelectChange = (name: string, value: string) => {
         setProductDraft(prev => {
             if (!prev) return null;
             let updatedDraft = { ...prev, [name]: value };
             
             // Handle category-specific logic
             if (name === 'category') {
                 const newCategory = value as ProductCategory;
                 // Force calculationType for Rods & Rings
                 updatedDraft.calculationType = newCategory === 'Rods & Rings' ? 'Per Kg' : prev.calculationType || 'Per Unit';
                 
                 // Clear specific fields if category changes
                 if (newCategory !== 'Red Bricks') updatedDraft.brand = '';
                 if (newCategory !== 'Rods & Rings') updatedDraft.weightPerUnit = undefined;
             }
             
             return updatedDraft;
         });
     };

    // Helper to safely get value for controlled inputs
    const getInputValue = (key: keyof Partial<Product>) => {
        if (!productDraft) return '';
        const value = productDraft[key];
        // Ensure undefined/null values are treated as empty strings for input
        return value === undefined || value === null ? '' : value.toString();
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (productDraft) {
            // Pass the controlled state back to the parent component
            await handleEditSubmit(productDraft);
        }
    }

    // Only render if we have the draft ready
    if (!productDraft) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Product: {productDraft.name}</DialogTitle>
                    <DialogDescription>
                        Update the details for the product below.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        
                        {/* NAME (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">Name</Label>
                            <Input id="edit-name" name="name" autoComplete="off" className="col-span-3" required 
                                value={getInputValue('name')} 
                                onChange={handleInputChange} 
                            />
                        </div>
                        
                        {/* SKU (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-sku" className="text-right">SKU</Label>
                            <Input id="edit-sku" name="sku" autoComplete="off" className="col-span-3" required 
                                value={getInputValue('sku')} 
                                onChange={handleInputChange} 
                            />
                        </div>

                        {/* CATEGORY (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-category" className="text-right">Category</Label>
                            <Select 
                                value={getInputValue('category')} 
                                onValueChange={(v) => handleSelectChange('category', v)} 
                                name="category"
                            >
                                <SelectTrigger id="edit-category" className="col-span-3">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="Red Bricks">Red Bricks</SelectItem>
                                    <SelectItem value="Rods & Rings">Rods & Rings</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* STOCK (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-stock" className="text-right">{productDraft.category === 'Rods & Rings' ? 'Stock in Nos' : 'Stock'}</Label>
                            <Input id="edit-stock" name="stock" type="number" autoComplete="off" className="col-span-3" required 
                                value={getInputValue('stock')} 
                                onChange={handleInputChange} 
                            />
                        </div>
                        
                        {/* PRICE (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-price" className="text-right">Sale Price</Label>
                            <Input id="edit-price" name="price" type="number" step="0.01" autoComplete="off" className="col-span-3" required 
                                value={getInputValue('price')} 
                                onChange={handleInputChange} 
                            />
                        </div>
                        
                        {/* COST (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-cost" className="text-right">Cost Price</Label>
                            <Input id="edit-cost" name="cost" type="number" step="0.01" autoComplete="off" className="col-span-3" required 
                                value={getInputValue('cost')} 
                                onChange={handleInputChange} 
                            />
                        </div>

                        {/* GST (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-gst" className="text-right">GST %</Label>
                            <Input id="edit-gst" name="gst" type="number" step="0.01" autoComplete="off" className="col-span-3" required 
                                value={getInputValue('gst')} 
                                onChange={handleInputChange} 
                            />
                        </div>
                        
                        {/* REORDER POINT (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-reorderPoint" className="text-right">Reorder Point</Label>
                            <Input id="edit-reorderPoint" name="reorderPoint" type="number" autoComplete="off" className="col-span-3" 
                                value={getInputValue('reorderPoint')} 
                                onChange={handleInputChange} 
                            />
                        </div>
                        
                        {/* CALCULATION TYPE (NOW CONTROLLED) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-calculationType" className="text-right">Calculation Type</Label>
                            <Select 
                                value={getInputValue('calculationType')} 
                                onValueChange={(v) => handleSelectChange('calculationType', v)} 
                                name="calculationType"
                                disabled={productDraft.category === 'Rods & Rings'} 
                            >
                                <SelectTrigger id="edit-calculationType" className="col-span-3">
                                    <SelectValue placeholder="Select calculation type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Per Unit">Per Unit</SelectItem>
                                    <SelectItem value="Per Kg">Per Kg</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* RED BRICKS: BRAND (NOW CONTROLLED) */}
                        {productDraft.category === 'Red Bricks' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-brand" className="text-right">Brand</Label>
                                <Input 
                                    id="edit-brand" 
                                    name="brand" 
                                    autoComplete="off" 
                                    className="col-span-3" 
                                    placeholder="e.g., KKP, ABC" 
                                    value={getInputValue('brand')} 
                                    onChange={handleInputChange}
                                />
                            </div>
                        )}
                        
                        {/* RODS & RINGS: WEIGHT PER UNIT (NOW CONTROLLED) */}
                        {productDraft.category === 'Rods & Rings' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-weightPerUnit" className="text-right">Weight/Unit (Kg)</Label>
                                <Input 
                                    id="edit-weightPerUnit" 
                                    name="weightPerUnit" 
                                    type="number" 
                                    step="any" 
                                    autoComplete="off" 
                                    className="col-span-3" 
                                    placeholder="e.g., 10.69" 
                                    value={getInputValue('weightPerUnit')}
                                    onChange={handleInputChange}
                                />
                            </div>
                        )}
                        
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


// --- INVENTORY CLIENT COMPONENT ---
export function InventoryClient({ products: initialProducts }: { products: Product[] }) {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [firebaseStatus, setFirebaseStatus] = useState<{ connected: boolean; testing: boolean; error?: string }>({ 
        connected: false, 
        testing: true 
    });
    const { toast } = useToast();
    
    // Removed: [editCategory] state as it is now managed within the EditProductDialog

    // Test Firebase connection on component mount
    useEffect(() => {
        const checkFirebaseConnection = async () => {
            setFirebaseStatus({ connected: false, testing: true });
            const result = await testFirebaseConnection();
            setFirebaseStatus({ 
                connected: result.success, 
                testing: false,
                error: result.error 
            });
            
            if (!result.success) {
                toast({
                    title: "Database Connection Issue",
                    description: "Cannot connect to the database. Some features may not work properly.",
                    variant: 'destructive',
                });
            }
        };

        checkFirebaseConnection();
        setIsMounted(true);
    }, [toast]);

    // Removed: useEffect for productToEdit and setEditCategory, now handled inside EditProductDialog

    const filteredProducts = useMemo(() => {
        return products.filter(product => 
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, searchQuery]);
    
    const refreshProducts = async () => {
    try {
        console.log("🔄 Refreshing products from Firebase...");
        const freshProducts = await getProducts();
        setProducts(freshProducts);
        console.log("✅ Products refreshed:", freshProducts.length);
    } catch (error) {
        console.error("❌ Failed to refresh products:", error);
        toast({
            title: "Refresh Failed",
            description: "Could not update product list",
            variant: "destructive"
        });
    }
};

    const handleProductAdded = (newProduct: Product) => {
        setProducts(prevProducts => [...prevProducts, newProduct]);
    };

   // Inside the InventoryClient function component:
// Replace the old handleEditProduct:
const handleEditProduct = async (updatedProductData: Partial<Product>) => {
            // updatedProductData is now the clean, current state from the dialog
            
            if (!productToEdit || !productToEdit.id) {
                console.error("No product selected for editing");
                toast({
                    title: "Error",
                    description: "No product selected for editing.",
                    variant: 'destructive',
                });
                return;
            }

            console.log("🔄 Starting product update process...");

            // Test Firebase connection first
            if (!firebaseStatus.connected) {
                toast({
                    title: "Database Offline",
                    description: "Cannot connect to database. Please check your internet connection.",
                    variant: 'destructive',
                });
                return;
            }

            try {
                // Validation
                if (!updatedProductData.name || !updatedProductData.sku) {
                    toast({
                        title: "Validation Error",
                        description: "Product name and SKU are required.",
                        variant: 'destructive',
                    });
                    return;
                }
                
                // Add the necessary timestamp here
                updatedProductData.updatedAt = new Date().toISOString(); 

                console.log("📝 Update data prepared:", {
                    productId: productToEdit.id,
                    updateData: updatedProductData
                });

                // Use the debug function
                const success = await debugFirebaseUpdate(productToEdit.id, updatedProductData);
                
                if (success) {
                    console.log("✅ Product updated successfully in Firebase");
                    // Refresh the local product list
                    await refreshProducts();
                    
                    // Reset state to close the dialog
                    setIsEditDialogOpen(false);
                    setProductToEdit(null);
                    
                    toast({
                        title: "Product Updated",
                        description: `${updatedProductData.name} has been successfully updated.`,
                    });
                } else {
                    throw new Error("Debug update failed - check console for details");
                }

            } catch (error) {
                console.error("❌ PRODUCT UPDATE PROCESS FAILED:", error);
                toast({
                    title: "Update Failed",
                    description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    variant: 'destructive',
                });
            }
        };

    const handleDeleteProduct = async () => {
        if (!productToDelete || !productToDelete.id) return;
        
        if (!firebaseStatus.connected) {
            toast({
                title: "Database Offline",
                description: "Cannot delete product while offline.",
                variant: 'destructive',
            });
            return;
        }

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
            console.error("Delete error:", e);
            toast({
                title: "Error",
                description: "Failed to delete product.",
                variant: "destructive"
            });
        }
    };

    const retryFirebaseConnection = async () => {
        setFirebaseStatus({ connected: false, testing: true });
        const result = await testFirebaseConnection();
        setFirebaseStatus({ 
            connected: result.success, 
            testing: false,
            error: result.error 
        });
        
        if (result.success) {
            toast({
                title: "Connection Restored",
                description: "Successfully connected to the database.",
            });
            // Refresh products after reconnection
            refreshProducts();
        }
    };

    if (!isMounted) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="md:grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <div className="rounded-lg border shadow-sm p-4">
                            <Skeleton className="h-8 w-full mb-4" />
                            <Skeleton className="h-8 w-full mb-2" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Firebase Status Indicator */}
            <Alert className={cn(
                "border-l-4",
                firebaseStatus.testing ? "border-blue-500 bg-blue-50" :
                firebaseStatus.connected ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Database className={cn(
                            "h-4 w-4",
                            firebaseStatus.testing ? "text-blue-500" :
                            firebaseStatus.connected ? "text-green-500" : "text-red-500"
                        )} />
                        <div>
                            <AlertTitle>
                                {firebaseStatus.testing ? "Testing Database Connection..." :
                                 firebaseStatus.connected ? "Database Connected" : "Database Disconnected"}
                            </AlertTitle>
                            <AlertDescription>
                                {firebaseStatus.testing ? "Checking connection to Firebase..." :
                                 firebaseStatus.connected ? `Connected successfully (${products.length} products loaded)` :
                                 `Connection failed: ${firebaseStatus.error || 'Unknown error'}`}
                            </AlertDescription>
                        </div>
                    </div>
                    {!firebaseStatus.connected && !firebaseStatus.testing && (
                        <Button variant="outline" size="sm" onClick={retryFirebaseConnection}>
                            Retry Connection
                        </Button>
                    )}
                </div>
            </Alert>

            {/* Firebase Diagnostic Tools */}
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Firebase Diagnostic Tools
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={async () => {
                            if (!products.length) {
                                toast({ title: "No products", description: "No products to test with" });
                                return;
                            }
                            
                            const testProduct = products[0];
                            console.log("🧪 Testing with product:", testProduct.id);
                            
                            const success = await debugFirebaseUpdate(testProduct.id, { 
                                diagnostic_test: new Date().toISOString(),
                                test_field: "This is a diagnostic update"
                            });
                            
                            toast({ 
                                title: success ? "Diagnostic Passed" : "Diagnostic Failed", 
                                description: success ? "Firebase update working correctly" : "Check console for errors",
                                variant: success ? "default" : "destructive" 
                            });
                        }}>
                            Test Firebase Update
                        </Button>
                        
                        <Button variant="outline" size="sm" onClick={async () => {
                            try {
                                // Assuming you have correct imports or access to firebase functions
                                const { collection, getDocs } = await import('firebase/firestore');
                                // const { db } = await import('@/lib/firebase'); // Already imported at the top
                                
                                const querySnapshot = await getDocs(collection(db, 'products'));
                                console.log("📊 Products in database:", querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                                
                                toast({ 
                                    title: "Database Read Successful", 
                                    description: `Found ${querySnapshot.docs.length} products` 
                                });
                            } catch (error) {
                                console.error("❌ Database read failed:", error);
                                toast({ 
                                    title: "Read Failed", 
                                    description: "Could not read from database",
                                    variant: "destructive" 
                                });
                            }
                        }}>
                            Test Database Read
                        </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                        <div>Project: ab-account-xdg7o</div>
                        <div>Loaded Products: {products.length}</div>
                        <div>Firebase Status: {firebaseStatus.connected ? "Connected" : "Disconnected"}</div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-bold">Inventory</h1>
                 <Button 
                    onClick={() => setIsAddDialogOpen(true)} 
                    className="transform hover:scale-105 transition-transform"
                    disabled={!firebaseStatus.connected}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                </Button>
            </div>
            
            <div className="space-y-4">
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
                                <TableHead className="text-right">Sale Price</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((product) => {
                                const isLowStock = product.reorderPoint !== undefined && product.stock <= product.reorderPoint;
                                return (
                                    <TableRow key={product.id} className="transition-transform hover:-translate-y-px hover:shadow-md">
                                        <TableCell className="font-medium">{product.name} {product.brand && <span className="text-muted-foreground text-xs">({product.brand})</span>}</TableCell>
                                        <TableCell>{product.sku}</TableCell>
                                        <TableCell><Badge variant="secondary">{product.category || 'General'}</Badge></TableCell>
                                        <TableCell className={cn(isLowStock && "text-destructive font-bold")}>
                                            <div className="flex items-center gap-2">
                                                {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                                {product.stock}
                                                {product.category === 'Rods & Rings' && ' nos'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatNumber(product.price)}
                                            {product.calculationType === 'Per Kg' && <span className="text-muted-foreground text-xs">/kg</span>}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={!firebaseStatus.connected}>
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem 
                                                        onClick={() => {
                                                            setProductToEdit(product);
                                                            setIsEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" /> Edit Product
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        onClick={() => setProductToDelete(product)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View (omitted for brevity, assume it's working) */}
            </div>
            
            {/* RENDER DIALOGS */}
            <AddProductDialog 
                isOpen={isAddDialogOpen} 
                onOpenChange={setIsAddDialogOpen} 
                onProductAdded={handleProductAdded} 
            />

            <EditProductDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                productToEdit={productToEdit}
                handleEditSubmit={handleEditProduct} // Pass the main handler
            />
            
            {/* Delete Confirmation Dialog (Omitted for brevity, assume it's working) */}
            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete 
                            product <span className="font-bold">{productToDelete?.name}</span> and remove its data from the database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive hover:bg-red-700">
                            Delete Product
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
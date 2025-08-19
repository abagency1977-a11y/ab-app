'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadFileToStorage } from '@/ai/flows/upload-file-to-storage';
import { Loader2 } from 'lucide-react';

const FULL_PAYMENT_INVOICE_URL = 'https://drive.google.com/file/d/1-P5Pf-9MhTCYMCv1pxbYSUKgetkxCDBH/view?usp=drive_link';
const CREDIT_INVOICE_URL = 'https://drive.google.com/file/d/1aN5Fl7ne11WbWFR8plC2q5XGFSyGjYKS/view?usp=drive_link';

export function AdminClient() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

    const handleUpload = async (url: string, fileName: string) => {
        setIsLoading(prev => ({...prev, [fileName]: true}));
        try {
            const result = await uploadFileToStorage({ url, fileName });
            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message,
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            toast({
                title: 'Upload Failed',
                description: error.message || 'An unknown error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(prev => ({...prev, [fileName]: false}));
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Invoice Templates</CardTitle>
                    <CardDescription>
                        Upload your PDF invoice templates. The system will use these files to generate invoices.
                        If you update a template, you must re-upload it here.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="full-payment-url" className="font-semibold">Full Payment Invoice</Label>
                            <p className="text-sm text-muted-foreground">Template used for orders paid in full.</p>
                        </div>
                         <Button 
                            onClick={() => handleUpload(FULL_PAYMENT_INVOICE_URL, 'full-payment-invoice.pdf')}
                            disabled={isLoading['full-payment-invoice.pdf']}
                        >
                            {isLoading['full-payment-invoice.pdf'] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload Template
                        </Button>
                    </div>
                     <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                           <Label htmlFor="credit-url" className="font-semibold">Credit Invoice</Label>
                            <p className="text-sm text-muted-foreground">Template used for orders on credit.</p>
                        </div>
                        <Button 
                            onClick={() => handleUpload(CREDIT_INVOICE_URL, 'credit-invoice.pdf')}
                            disabled={isLoading['credit-invoice.pdf']}
                        >
                             {isLoading['credit-invoice.pdf'] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload Template
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

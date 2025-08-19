'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export function AdminClient() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Invoice Templates</CardTitle>
                    <CardDescription>
                        To enable invoice generation, please add your PDF templates to the project.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            <p>Please move your two invoice template PDF files into the following directory in your project structure:</p>
                            <code className="block bg-muted p-2 rounded-md my-2 text-sm">public/templates/</code>
                            <p className="mt-2">Ensure the files are named exactly as follows:</p>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                                <li><code className="bg-muted px-1 rounded-sm">full-payment-invoice.pdf</code></li>
                                <li><code className="bg-muted px-1 rounded-sm">credit-invoice.pdf</code></li>
                            </ul>
                             <p className="mt-4">Once the files are in place, the "Generate Invoice" feature on the Orders page will work correctly. You may need to create the `templates` directory inside `public` if it does not exist.</p>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}

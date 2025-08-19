'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResult {
    status: UploadStatus;
    message: string;
}

const TemplateUploader = ({ title, description, requiredFilename, onUpload }: {
    title: string;
    description: string;
    requiredFilename: string;
    onUpload: (status: UploadResult) => void;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.name !== requiredFilename) {
                setError(`Invalid filename. Please select a file named "${requiredFilename}".`);
                setSelectedFile(null);
            } else if (file.type !== 'application/pdf') {
                setError('Invalid file type. Please select a PDF file.');
                setSelectedFile(null);
            } else {
                setError(null);
                setSelectedFile(file);
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file first.');
            return;
        }

        setStatus('uploading');
        setError(null); // Clear previous errors
        onUpload({ status: 'uploading', message: '' });

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            setStatus('success');
            onUpload({ status: 'success', message: `Successfully uploaded ${selectedFile.name}` });
            
        } catch (e: any) {
            const errorMessage = e.message || "An unknown error occurred during upload.";
            setStatus('error');
            setError(errorMessage);
            onUpload({ status: 'error', message: errorMessage });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={`file-upload-${requiredFilename}`}>PDF Template</Label>
                    <div className="flex gap-2">
                         <Input
                            id={`file-upload-${requiredFilename}`}
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="flex-grow"
                         />
                         <Button onClick={handleUpload} disabled={!selectedFile || status === 'uploading'}>
                            {status === 'uploading' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UploadCloud className="mr-2 h-4 w-4" />
                            )}
                            Upload
                         </Button>
                    </div>
                </div>
                 {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Upload Failed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                 {status === 'success' && (
                    <Alert variant="default" className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
                        <AlertDescription className="text-green-700">
                            The template <code className="font-mono bg-green-100 px-1 rounded-sm">{requiredFilename}</code> is now ready for use.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};


export function AdminClient() {
    const [fullPaymentStatus, setFullPaymentStatus] = useState<UploadResult>({ status: 'idle', message: '' });
    const [creditStatus, setCreditStatus] = useState<UploadResult>({ status: 'idle', message: '' });

    const allUploaded = fullPaymentStatus.status === 'success' && creditStatus.status === 'success';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Invoice Template Management</CardTitle>
                    <CardDescription>
                        Upload your PDF invoice templates here. The system requires two specific files.
                        Please ensure the filenames are exactly as specified below before uploading.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <TemplateUploader 
                        title="Full Payment Invoice"
                        description="Template for orders that are paid in full."
                        requiredFilename="full-payment-invoice.pdf"
                        onUpload={setFullPaymentStatus}
                    />
                     <TemplateUploader 
                        title="Credit Invoice"
                        description="Template for orders placed on credit."
                        requiredFilename="credit-invoice.pdf"
                        onUpload={setCreditStatus}
                    />

                    {allUploaded && (
                         <Alert variant="default" className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Setup Complete!</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Both invoice templates have been successfully uploaded. The "Generate Invoice" feature on the Orders page is now fully functional.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

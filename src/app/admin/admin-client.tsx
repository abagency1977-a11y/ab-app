
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, UploadCloud, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResult {
    status: UploadStatus;
    message: string;
}

const FileUploader = ({ title, description, requiredFilename, acceptedFileType, onUpload, storageKey }: {
    title: string;
    description: string;
    requiredFilename: string;
    acceptedFileType: string;
    onUpload: (status: UploadResult) => void;
    storageKey?: string;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if(storageKey) {
            const savedFile = localStorage.getItem(storageKey);
            if (savedFile) {
                setPreview(savedFile);
                setStatus('success');
            }
        }
    }, [storageKey]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith(acceptedFileType.split('/')[0])) {
                setError(`Invalid file type. Please select a ${acceptedFileType.split('/')[0]} file.`);
                setSelectedFile(null);
                 setPreview(null);
            } else {
                setError(null);
                setSelectedFile(file);
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file first.');
            return;
        }

        setStatus('uploading');
        setError(null);
        onUpload({ status: 'uploading', message: '' });
        
        // For logo, we save it to local storage
        if(storageKey) {
             const reader = new FileReader();
             reader.onloadend = () => {
                localStorage.setItem(storageKey, reader.result as string);
                setStatus('success');
                onUpload({ status: 'success', message: `Successfully uploaded ${selectedFile.name}` });
             };
             reader.readAsDataURL(selectedFile);
             return;
        }


        const formData = new FormData();
        formData.append('file', selectedFile, requiredFilename);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Upload failed with status: ${response.status}`);
            }

            setStatus('success');
            onUpload({ status: 'success', message: `Successfully uploaded ${selectedFile.name}` });
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; 
            }
            setSelectedFile(null);
            
        } catch (e: any) {
            const errorMessage = e.message || "An unknown error occurred during upload.";
            setStatus('error');
            setError(errorMessage);
            onUpload({ status: 'error', message: errorMessage });
        }
    };

    if (!isMounted) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <div className="flex gap-2">
                            <Skeleton className="h-10 flex-grow" />
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

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
                {preview && acceptedFileType.startsWith('image/') && (
                    <div className="flex justify-center p-4 border rounded-md">
                        <img src={preview} alt="Logo preview" className="max-h-24" />
                    </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor={`file-upload-${requiredFilename}`}>{requiredFilename}</Label>
                    <div className="flex gap-2">
                         <Input
                            id={`file-upload-${requiredFilename}`}
                            ref={fileInputRef}
                            type="file"
                            accept={acceptedFileType}
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
                            The file <code className="font-mono bg-green-100 px-1 rounded-sm">{requiredFilename}</code> is now ready for use.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};


function ResetDatabaseCard() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleReset = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/reset-db', { method: 'POST' });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to reset database');
            }
            
            toast({
                title: "Database Reset Successful",
                description: "Your customers, orders, and suppliers have been cleared. Please refresh the page.",
            });
        } catch (error: any) {
            toast({
                title: "Error Resetting Database",
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle>Reset Application Data</CardTitle>
                <CardDescription>
                    This will permanently delete all customers, suppliers, orders, and invoices. Your inventory will not be affected. This action cannot be undone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isLoading}>
                             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
                            {isLoading ? "Resetting..." : "Reset All Transactional Data"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all customer, supplier, order, and purchase data. Your product inventory will remain. This action is irreversible and will start all counters from 1 again.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReset}>Yes, Reset Data</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

export function AdminClient() {
    const [logoStatus, setLogoStatus] = useState<UploadResult>({ status: 'idle', message: '' });

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Company Branding</CardTitle>
                    <CardDescription>
                        Upload your company logo to be displayed on invoices.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <FileUploader 
                        title="Company Logo"
                        description="Recommended format: PNG with transparent background. Max height: 100px."
                        requiredFilename="company-logo"
                        acceptedFileType="image/*"
                        onUpload={setLogoStatus}
                        storageKey="companyLogo"
                    />
                </CardContent>
            </Card>

            <ResetDatabaseCard />
        </div>
    );
}

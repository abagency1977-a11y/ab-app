
'use client';

import React, { useState, useEffect } from 'react';
import type { Customer, Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Home, DollarSign, Calendar, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { jsPDF as jsPDFType } from 'jspdf';

interface jsPDFWithAutoTable extends jsPDFType {
    autoTable: (options: any) => jsPDFWithAutoTable;
}


const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN');

function InfoCard({ icon: Icon, label, value, className }: { icon: React.ElementType, label: string, value: React.ReactNode, className?: string }) {
    return (
        <div className={`flex items-start gap-3 rounded-lg bg-muted/50 p-3 ${className}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-base font-semibold">{value}</p>
            </div>
        </div>
    );
}

export function CustomerDetailsClient({ customer, orders }: { customer: Customer, orders: Order[] }) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) {
            setLogoUrl(savedLogo);
        }
    }, []);


    const totalPaid = orders.reduce((sum, order) => {
        const orderPayments = order.payments?.reduce((paymentSum, payment) => paymentSum + payment.amount, 0) ?? 0;
        return sum + orderPayments;
    }, 0);
    
    const totalDue = customer.transactionHistory.totalSpent - totalPaid;

    const handleDownloadPdf = () => {
        const doc = new jsPDF() as jsPDFWithAutoTable;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;

        // --- Custom INR Formatter ---
        const formatInr = (value: number) => `INR ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

        // --- Header ---
        let yPos = 15;
        if (logoUrl) {
            const logoWidth = 25; 
            const logoHeight = 20;
            doc.addImage(logoUrl, 'PNG', pageWidth / 2 - (logoWidth/2), yPos, logoWidth, logoHeight);
            yPos += logoHeight + 5;
        }
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('No.1, Ayyanchery main road, Urapakkam, Chennai - 603210', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
        doc.text('Email: abagency1977@gmail.com | MOB: 95511 95505 / 95001 82975', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        // --- Title ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`CUSTOMER HISTORY: ${customer.name}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;

        // --- Customer Info ---
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Information', margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${customer.name}`, margin, yPos);
        doc.text(`Phone: ${customer.phone}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 5;
        doc.text(`Address: ${customer.address}`, margin, yPos);
        doc.text(`Email: ${customer.email}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 10;


        // --- Table ---
        const tableColumn = ["Order ID", "Date", "Status", "Paid Amount", "Balance Due", "Grand Total"];
        const tableRows: (string | number)[][] = [];

        orders.forEach(order => {
            const orderPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
            const orderRow = [
                order.id,
                formatDate(order.orderDate),
                order.status,
                formatInr(orderPaid),
                formatInr(order.balanceDue ?? 0),
                formatInr(order.grandTotal)
            ];
            tableRows.push(orderRow);
        });
        
        const summaryRows = [
            ["", "", "", "", "Total Ordered:", formatInr(customer.transactionHistory.totalSpent)],
            ["", "", "", "", "Total Paid:", formatInr(totalPaid)],
            ["", "", "", "", "Total Due:", formatInr(totalDue)],
        ];
        
        const finalTableRows = [...tableRows, [], ...summaryRows];

        doc.autoTable({
            head: [tableColumn],
            body: finalTableRows,
            startY: yPos,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74] }, // Primary color
            styles: {
                halign: 'right', // Align all cells right by default
            },
            columnStyles: {
                0: { halign: 'left' }, // Order ID
                1: { halign: 'left' }, // Date
                2: { halign: 'center' }, // Status
            },
        });

        doc.save(`customer-history-${customer.id}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/customers">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">{customer.name}</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>Contact and transaction summary.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <InfoCard icon={DollarSign} label="Total Ordered" value={formatNumber(customer.transactionHistory.totalSpent)} />
                        <InfoCard icon={CheckCircle} label="Total Paid" value={formatNumber(totalPaid)} className="text-green-700" />
                        <InfoCard icon={AlertCircle} label="Total Due" value={formatNumber(totalDue)} className={totalDue > 0 ? "text-red-700" : ""} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard icon={Mail} label="Email" value={customer.email} />
                        <InfoCard icon={Phone} label="Phone" value={customer.phone} />
                        <InfoCard icon={Home} label="Address" value={customer.address} />
                     </div>
                     <div className="mt-4 grid grid-cols-1">
                        <InfoCard icon={Calendar} label="Last Purchase" value={formatDate(customer.transactionHistory.lastPurchaseDate)} />
                     </div>
                </CardContent>
            </Card>

            <Separator />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Customer History</CardTitle>
                            <CardDescription>A complete list of all orders placed by {customer.name}.</CardDescription>
                        </div>
                        <Button onClick={handleDownloadPdf}>
                            <Download className="mr-2 h-4 w-4" />
                            Download as PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Paid Amount</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead className="text-right">Grand Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => {
                                    const orderPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
                                    return (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.id}</TableCell>
                                        <TableCell>{formatDate(order.orderDate)}</TableCell>
                                        <TableCell>
                                            <Badge variant={order.status === 'Fulfilled' ? 'default' : order.status === 'Pending' ? 'secondary' : 'destructive'} className="capitalize">
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">{formatNumber(orderPaid)}</TableCell>
                                        <TableCell className="text-right font-medium text-red-600">{formatNumber(order.balanceDue ?? 0)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(order.grandTotal)}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

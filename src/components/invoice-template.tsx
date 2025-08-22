

'use client';
import React from 'react';
import type { Order, Customer, OrderItem } from '@/lib/types';

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};


interface InvoiceTemplateProps {
  order: Order;
  customer: Customer;
  logoUrl?: string;
}

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ order, customer, logoUrl }, ref) => {

    const currentInvoiceAmount = order.total;
    const previousBalance = order.previousBalance ?? 0;

  return (
    <div ref={ref} id="invoice-to-print" className="bg-white text-black p-8 font-sans" style={{ display: 'none' }}>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

    

    

    

    
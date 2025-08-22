
'use client';
import React from 'react';
import type { Order, Customer, OrderItem } from '@/lib/types';

// This component is no longer used for direct PDF generation
// but is kept as a reference or for potential future use cases like
// displaying an HTML version of the invoice within the app.
// The primary PDF generation logic now resides in `orders-client.tsx`.

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

  return (
    <div ref={ref} id="invoice-to-print" className="bg-white text-black p-8 font-sans" style={{ display: 'none' }}>
        {/* This is intentionally left blank as the PDF is now generated directly in the client component */}
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

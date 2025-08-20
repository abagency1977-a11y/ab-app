
'use client';
import React from 'react';
import type { Order, Customer } from '@/lib/types';

// This component is now a data structure holder for the manual PDF generation.
// It is kept in the DOM (but hidden) to trigger the generation process
// when an order is selected for printing, but it is not rendered to canvas directly.

interface InvoiceTemplateProps {
  order: Order;
  customer: Customer;
  logoUrl?: string;
}

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ order, customer, logoUrl }, ref) => {
  return <div ref={ref} style={{ position: 'fixed', left: '-200vw', top: 0, zIndex: -1 }}></div>;
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

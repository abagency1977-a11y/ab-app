
'use client';
import React from 'react';
import type { Order, Customer } from '@/lib/types';
import { Rupee } from '@/components/icons';

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

interface InvoiceTemplateProps {
  order: Order;
  customer: Customer;
  logoUrl?: string;
}

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ order, customer, logoUrl }, ref) => {
    const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalGst = order.isGstInvoice ? order.items.reduce((acc, item) => acc + (item.price * item.quantity * (item.gst / 100)), 0) : 0;

  return (
    <div ref={ref} className="bg-white text-black p-8" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'PT Sans', sans-serif" }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          {logoUrl ? (
            <img src={logoUrl} alt="Company Logo" className="h-20" />
          ) : (
            <div className="h-20 w-40 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">Your Logo</span>
            </div>
          )}
           <h1 className="text-2xl font-bold text-blue-700 mt-2">AB Account</h1>
           <p className="text-sm">123 Business Rd, Suite 101, Commerce City, 400001</p>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold uppercase text-gray-700">Invoice</h2>
          <p className="mt-2"><span className="font-bold">Invoice #:</span> {order.id.replace('ORD', 'INV')}</p>
          <p><span className="font-bold">Date:</span> {new Date(order.orderDate).toLocaleDateString()}</p>
           {order.deliveryDate && <p><span className="font-bold">Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString()}</p>}
           {order.dueDate && <p className="text-red-500"><span className="font-bold">Due Date:</span> {new Date(order.dueDate).toLocaleDateString()}</p>}
        </div>
      </div>

      <div className="flex justify-between mb-8">
        <div>
          <h3 className="font-bold text-gray-600">Billed To:</h3>
          <p>{customer.name}</p>
          <p>{customer.address}</p>
          <p>{customer.email}</p>
          <p>{customer.phone}</p>
        </div>
        <div className="text-right">
            <h3 className="font-bold text-gray-600">Delivery Address:</h3>
            <p>{order.deliveryAddress || customer.address}</p>
        </div>
      </div>

      <table className="w-full text-left mb-8 table-auto">
        <thead className="bg-gray-800 text-white">
          <tr>
            <th className="p-3">Item Description</th>
            <th className="p-3 text-right">Qty</th>
            <th className="p-3 text-right">Rate</th>
            {order.isGstInvoice && <th className="p-3 text-right">GST</th>}
            <th className="p-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index} className="border-b">
              <td className="p-3">{item.productName}</td>
              <td className="p-3 text-right">{item.quantity}</td>
              <td className="p-3 text-right flex items-center justify-end"><Rupee className="inline-block h-3 w-3 mr-1" />{formatNumber(item.price)}</td>
              {order.isGstInvoice && <td className="p-3 text-right">{item.gst}%</td>}
              <td className="p-3 text-right flex items-center justify-end"><Rupee className="inline-block h-3 w-3 mr-1" />{formatNumber(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8">
        <div className="w-1/2">
            <div className="flex justify-between p-2 bg-gray-100">
                <span>Subtotal</span>
                <span className="flex items-center"><Rupee className="inline-block h-4 w-4 mr-1" />{formatNumber(subtotal)}</span>
            </div>
            {order.isGstInvoice && (
                <div className="flex justify-between p-2">
                    <span>Total GST</span>
                    <span className="flex items-center"><Rupee className="inline-block h-4 w-4 mr-1" />{formatNumber(totalGst)}</span>
                </div>
            )}
             {order.discount > 0 && (
                <div className="flex justify-between p-2">
                    <span>Discount</span>
                    <span className="text-green-600 flex items-center">- <Rupee className="inline-block h-4 w-4 mr-1" />{formatNumber(order.discount)}</span>
                </div>
            )}
             <div className="flex justify-between p-2 bg-gray-800 text-white font-bold text-lg">
                <span>Grand Total</span>
                <span className="flex items-center"><Rupee className="inline-block h-5 w-5 mr-1" />{formatNumber(order.grandTotal)}</span>
            </div>
        </div>
      </div>
      
      {order.paymentTerm === 'Full Payment' && order.paymentMode && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-bold text-green-800">Payment Details</h3>
            <p className="text-green-700">Payment Mode: {order.paymentMode}</p>
            {order.paymentRemarks && <p className="text-green-700">Remarks: {order.paymentRemarks}</p>}
            <p className="text-green-700 font-bold mt-2">Status: PAID IN FULL</p>
          </div>
      )}

      {order.paymentTerm === 'Credit' && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800">Payment Due</h3>
            <p className="text-red-700">Amount Due: <span className="font-bold flex items-center"><Rupee className="inline-block h-4 w-4 mr-1" />{formatNumber(order.grandTotal)}</span></p>
            {order.dueDate && <p className="text-red-700">Due Date: {new Date(order.dueDate).toLocaleDateString()}</p>}
          </div>
      )}

      <div className="text-center text-gray-500 text-xs">
        <p>Thank you for your business!</p>
        <p>This is a computer-generated invoice and does not require a signature.</p>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';


'use client';
import React from 'react';
import type { Order, Customer } from '@/lib/types';

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
    <div ref={ref} className="bg-white text-black p-8 font-sans" style={{ width: '210mm', minHeight: '297mm', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="text-center">
        {logoUrl && (
          <img src={logoUrl} alt="Company Logo" className="h-20 mx-auto mb-2" data-ai-hint="logo" />
        )}
        <h2 className="text-2xl font-bold">AB Agency</h2>
        <p className="text-xs">No.1, Ayyanchery main road, Ayyanchery, Urapakkam</p>
        <p className="text-xs">Chennai - 603210</p>
        <br />
        <p className="text-xs">Email - abagency1977@gmail.com, MOB: 95511 95505 / 95001 82975</p>
      </div>

      <div className="flex justify-between items-start mt-8 mb-4">
        {/* Left-aligned Invoice details */}
        <div className="w-1/2">
        </div>

        {/* Right-aligned Invoice details */}
        <div className="w-1/2 text-right">
          <h2 className="text-4xl font-bold uppercase text-gray-700">Invoice</h2>
          <p className="mt-2"><span className="font-bold">Invoice #:</span> {order.id.replace('ORD', 'INV')}</p>
          <p><span className="font-bold">Date:</span> {new Date(order.orderDate).toLocaleDateString('en-GB')}</p>
          {order.deliveryDate && <p><span className="font-bold">Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString('en-GB')}</p>}
        </div>
      </div>
      
      {/* Billed To and Delivery Address */}
      <div className="flex justify-between mt-4 mb-8">
        <div>
          <h3 className="font-bold text-gray-600 mb-2">Billed To:</h3>
          <p className="font-bold">{customer.name}</p>
          <p>{customer.address}</p>
          <p>{customer.email}</p>
          <p>{customer.phone}</p>
        </div>
        <div className="text-left">
            <h3 className="font-bold text-gray-600 mb-2">Delivery Address:</h3>
            <p>{order.deliveryAddress || customer.address}</p>
        </div>
      </div>
      
      {/* Items Table */}
      <div className="flex-grow">
        <table className="w-full text-left table-auto text-sm">
            <thead className="bg-gray-800 text-white">
            <tr>
                <th className="p-2">Item Description</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Rate</th>
                {order.isGstInvoice && <th className="p-2 text-right">GST</th>}
                <th className="p-2 text-right">Amount</th>
            </tr>
            </thead>
            <tbody>
            {order.items.map((item, index) => (
                <tr key={index} className="border-b">
                <td className="p-2">{item.productName}</td>
                <td className="p-2 text-right">{item.quantity}</td>
                <td className="p-2 text-right">₹{formatNumber(item.price)}</td>
                {order.isGstInvoice && <td className="p-2 text-right">{item.gst}%</td>}
                <td className="p-2 text-right">₹{formatNumber(item.price * item.quantity)}</td>
                </tr>
            ))}
            </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8">
        <div className="flex justify-end mb-4">
          <div className="w-1/2">
              <div className="flex justify-between items-center p-2 bg-gray-100">
                  <span>Subtotal</span>
                  <span>₹{formatNumber(subtotal)}</span>
              </div>
              {order.isGstInvoice && (
                  <div className="flex justify-between items-center p-2">
                      <span>Total GST</span>
                      <span>₹{formatNumber(totalGst)}</span>
                  </div>
              )}
              {order.deliveryFees > 0 && (
                  <div className="flex justify-between items-center p-2">
                      <span>Delivery Fees</span>
                      <span>₹{formatNumber(order.deliveryFees)}</span>
                  </div>
              )}
              {order.discount > 0 && (
                  <div className="flex justify-between items-center p-2">
                      <span>Discount</span>
                      <span className="text-green-600">-₹{formatNumber(order.discount)}</span>
                  </div>
              )}
              <div className="flex justify-between items-center p-2 bg-gray-800 text-white font-bold text-lg">
                  <span>Grand Total</span>
                  <span>₹{formatNumber(order.grandTotal)}</span>
              </div>
          </div>
        </div>
        
        {order.paymentTerm === 'Full Payment' && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
              <h3 className="font-bold text-green-800">Payment Details</h3>
              <p className="text-green-700">Payment Mode: {order.paymentMode}</p>
              {order.paymentRemarks && <p className="text-green-700">Remarks: {order.paymentRemarks}</p>}
              <p className="text-green-700 font-bold mt-2">Status: PAID IN FULL</p>
            </div>
        )}

        {order.paymentTerm === 'Credit' && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
              <h3 className="font-bold text-red-800">Payment Due</h3>
              <p className="text-red-700 font-bold">Balance Due: ₹{formatNumber(order.balanceDue)}</p>
              {order.dueDate && <p className="text-red-700">Due Date: {new Date(order.dueDate).toLocaleDateString('en-GB')}</p>}
            </div>
        )}

        <div className="text-center text-gray-500 text-xs mt-8">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';


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
    <div ref={ref} className="bg-white text-black p-8" style={{ width: '210mm', fontFamily: "'Inter', sans-serif" }}>
      <div data-invoice-section="header">
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1 text-center">
            {logoUrl && (
              <img src={logoUrl} alt="Company Logo" className="h-20 mx-auto" />
            )}
            <h2 className="text-2xl font-bold mt-2">AB Agency</h2>
            <p className="text-xs">No.1, Ayyanchery main road, Ayyanchery, Urapakkam</p>
            <p className="text-xs">Chennai - 603210</p>
            <br />
            <p className="text-xs mt-2">Email - abagency1977@gmail.com, MOB: 95511 95505 / 95001 82975</p>
          </div>
          <div className="text-right w-1/3">
            <h2 className="text-4xl font-bold uppercase text-gray-700">Invoice</h2>
            <p className="mt-2"><span className="font-bold">Invoice #:</span> {order.id.replace('ORD', 'INV')}</p>
            <p><span className="font-bold">Date:</span> {new Date(order.orderDate).toLocaleDateString('en-IN')}</p>
            {order.deliveryDate && <p><span className="font-bold">Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString('en-IN')}</p>}
            {order.dueDate && <p className="text-red-500"><span className="font-bold">Due Date:</span> {new Date(order.dueDate).toLocaleDateString('en-IN')}</p>}
          </div>
        </div>

        <div className="flex justify-between mb-8">
          <div>
            <h3 className="font-bold text-gray-600 mb-2">Billed To:</h3>
            <p className="font-bold">{customer.name}</p>
            <p>{customer.address}</p>
            <p>{customer.email}</p>
            <p>{customer.phone}</p>
          </div>
          <div className="text-right">
              <h3 className="font-bold text-gray-600 mb-2">Delivery Address:</h3>
              <p>{order.deliveryAddress || customer.address}</p>
          </div>
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
              <td className="p-3 text-right">₹{formatNumber(item.price)}</td>
              {order.isGstInvoice && <td className="p-3 text-right">{item.gst}%</td>}
              <td className="p-3 text-right">₹{formatNumber(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div data-invoice-section="footer">
        <div className="flex justify-end mb-8">
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
              <p className="text-red-700 font-bold">₹{formatNumber(order.balanceDue)}</p>
              {order.dueDate && <p className="text-red-700">Due Date: {new Date(order.dueDate).toLocaleDateString('en-IN')}</p>}
            </div>
        )}

        <div className="text-center text-gray-500 text-xs absolute bottom-8 left-1/2 -translate-x-1/2">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

    
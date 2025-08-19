
'use client';
import React from 'react';
import type { Order, Customer, Payment } from '@/lib/types';

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

interface ReceiptTemplateProps {
  order: Order;
  customer: Customer;
  payment: Payment;
  logoUrl?: string;
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, ReceiptTemplateProps>(({ order, customer, payment, logoUrl }, ref) => {
    const balanceDueAfterPayment = (order.balanceDue ?? 0) + payment.amount;

  return (
    <div ref={ref} className="bg-white text-black p-6" style={{ width: '148mm', minHeight: '210mm', fontFamily: "'Inter', sans-serif" }}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          {logoUrl && (
            <img src={logoUrl} alt="Company Logo" className="h-16" />
          )}
           <div>
            <h2 className="text-xl font-bold">AB Agency</h2>
            <p className="text-xs">No.1, Ayyanchery main road, Urapakkam</p>
            <p className="text-xs">abagency1977@gmail.com | 9551195505</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-gray-700">Receipt</h2>
          <p className="mt-1 text-xs"><span className="font-bold">Receipt #:</span> {payment.id.replace('PAY', 'RCPT')}</p>
          <p className="text-xs"><span className="font-bold">Payment Date:</span> {new Date(payment.paymentDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="font-bold text-gray-600 mb-1 text-sm">Billed To:</h3>
          <p className="font-bold text-base">{customer.name}</p>
          <p className="text-xs">{customer.address}</p>
          <p className="text-xs">{customer.email}</p>
        </div>
        <div className="text-right">
          <h3 className="font-bold text-gray-600 mb-1 text-sm">Payment Details:</h3>
          <p className="text-xs">Invoice #: {order.id.replace('ORD', 'INV')}</p>
          <p className="text-xs">Payment Method: {payment.method}</p>
          {payment.notes && <p className="text-xs">Notes: {payment.notes}</p>}
        </div>
      </div>
      
      <div className="text-center my-8">
        <p className="text-sm text-gray-600">Amount Paid</p>
        <p className="text-5xl font-bold tracking-tight">₹{formatNumber(payment.amount)}</p>
      </div>


      <table className="w-full text-sm text-left mb-6">
        <tbody>
            <tr className="border-t">
                <td className="p-2">Original Invoice Total</td>
                <td className="p-2 text-right">₹{formatNumber(order.grandTotal)}</td>
            </tr>
            <tr className="border-t">
                <td className="p-2">Amount Paid This Transaction</td>
                <td className="p-2 text-right text-green-600">(-) ₹{formatNumber(payment.amount)}</td>
            </tr>
            <tr className="border-t border-b-2 border-gray-800 font-bold">
                <td className="p-2">Balance Due</td>
                <td className="p-2 text-right">₹{formatNumber(order.balanceDue)}</td>
            </tr>
        </tbody>
      </table>

      <div className="text-center text-gray-500 text-xs absolute bottom-6 left-1/2 -translate-x-1/2 w-full px-6">
        <p>Thank you for your payment!</p>
        <p>This is a computer-generated receipt and does not require a signature.</p>
      </div>
    </div>
  );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';


'use client';
import React from 'react';
import type { Order, Customer, OrderItem } from '@/lib/types';

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(0);
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
    <div ref={ref} className="bg-white text-black p-8 font-sans" style={{ position: 'fixed', left: '-200vw', top: 0, zIndex: -1, width: '210mm' }}>
        <style>
            {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                .font-sans { font-family: 'Inter', sans-serif; }
            `}
        </style>
        <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
            <div className="flex-1">
                {logoUrl ? <img src={logoUrl} alt="Company Logo" style={{ maxHeight: '70px' }}/> : <h1 className="text-3xl font-bold text-gray-800">AB Agency</h1>}
            </div>
            <div className="flex-1 text-right">
                <h2 className="text-4xl font-bold uppercase text-gray-700">{order.paymentTerm === 'Credit' ? 'Credit Invoice' : 'Invoice'}</h2>
                <p className="text-sm text-gray-500 mt-2">Invoice #: {order.id.replace('ORD', 'INV')}</p>
                <p className="text-sm text-gray-500">Date: {new Date(order.orderDate).toLocaleDateString('en-GB')}</p>
                 {order.paymentTerm === 'Credit' && order.dueDate && (
                     <p className="text-sm font-bold text-red-600">Due Date: {new Date(order.dueDate).toLocaleDateString('en-GB')}</p>
                 )}
            </div>
        </header>

        <section className="grid grid-cols-2 gap-8 my-8">
            <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Billed To</h3>
                <p className="font-bold text-lg text-gray-800">{customer.name}</p>
                <p className="text-gray-600 text-sm">{customer.address}</p>
                <p className="text-gray-600 text-sm">{customer.email} | {customer.phone}</p>
            </div>
            <div className="text-right">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Company Details</h3>
                <p className="font-bold text-lg text-gray-800">AB Agency</p>
                <p className="text-gray-600 text-sm">No.1, Ayyanchery main road, Ayyanchery, Urapakkam, Chennai - 603210</p>
                <p className="text-gray-600 text-sm">abagency1977@gmail.com | 95511 95505</p>
                <p className="font-bold text-sm mt-2">GSTIN: 33DMLPA8598D1ZU</p>
            </div>
        </section>

        <section>
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase">
                    <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Item Description</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Rate</th>
                        {order.isGstInvoice && <th className="p-3 text-center">GST</th>}
                        <th className="p-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => {
                        const itemSubtotal = item.price * item.quantity;
                        return (
                            <tr key={item.productId} className="border-b">
                                <td className="p-3 text-center">{index + 1}</td>
                                <td className="p-3 font-medium">{item.productName}</td>
                                <td className="p-3 text-right">{item.quantity}</td>
                                <td className="p-3 text-right">{formatNumber(item.price)}</td>
                                {order.isGstInvoice && <td className="p-3 text-center">{item.gst}%</td>}
                                <td className="p-3 text-right font-medium">{formatNumber(itemSubtotal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>

        <section className="flex justify-end mt-4">
            <div className="w-1/2">
                <table className="w-full text-sm">
                    <tbody>
                         <tr>
                            <td className="p-2 text-gray-600 text-right">Current Invoice Total:</td>
                            <td className="p-2 font-bold text-right">{formatNumber(currentInvoiceAmount)}</td>
                        </tr>
                        {order.deliveryFees > 0 && (
                            <tr>
                                <td className="p-2 text-gray-600 text-right">Delivery Fees:</td>
                                <td className="p-2 font-bold text-right">{formatNumber(order.deliveryFees)}</td>
                            </tr>
                        )}
                         {order.discount > 0 && (
                            <tr>
                                <td className="p-2 text-gray-600 text-right">Discount:</td>
                                <td className="p-2 font-bold text-right text-green-600">-{formatNumber(order.discount)}</td>
                            </tr>
                        )}
                        {previousBalance > 0 && (
                             <tr>
                                <td className="p-2 text-gray-600 text-right">Previous Balance:</td>
                                <td className="p-2 font-bold text-right text-red-600">{formatNumber(previousBalance)}</td>
                            </tr>
                        )}
                        <tr className="border-t-2">
                             <td className="p-3 text-lg font-bold text-right bg-gray-100">Grand Total:</td>
                             <td className="p-3 text-lg font-bold text-right bg-gray-100">{formatNumber(order.grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <footer className="text-center text-xs text-gray-500 mt-16 pt-4 border-t">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
        </footer>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

    

import React from 'react';
import type { Order, Customer } from '@/lib/types';
import { Icons, Rupee } from '@/components/icons';

interface InvoiceTemplateProps {
  order: Order | null;
  customer: Customer | undefined;
}

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ order, customer }, ref) => {
    if (!order || !customer) {
      return <div ref={ref}>Loading...</div>;
    }

    const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return (
      <div ref={ref} className="bg-white text-black p-8 font-sans text-sm">
        <div className="w-[210mm] h-[297mm] mx-auto">
            {/* Header */}
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold text-[#4A90E2]">AB AGENCY</h1>
                <p>1, AYYANCHERY MAIN ROAD, AYYANCHERY URAPAKKAM</p>
                <p>Chennai, Tamil Nadu, 603210</p>
                <p>MOB: +91 9551195505 | Email: abagency1977@gmail.com</p>
            </header>

            {/* Title */}
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold underline">
                    {order.paymentTerm === 'Credit' ? 'CREDIT INVOICE' : 'INVOICE'}
                </h2>
            </div>
            
            {/* Customer and Invoice Details */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div className="border border-black p-2">
                    <p className="font-bold">Billed to:</p>
                    <p>{customer.name}</p>
                </div>
                 <div className="border border-black p-2">
                    <p><span className="font-bold">Date:</span> {new Date(order.orderDate).toLocaleDateString()}</p>
                    <p><span className="font-bold">Invoice No:</span> {order.id.replace('ORD', 'INV')}</p>
                </div>
                <div className="border border-black p-2">
                    <p className="font-bold">Delivery Address:</p>
                    <p>{order.deliveryAddress || customer.address}</p>
                </div>
                <div className="border border-black p-2">
                    <p><span className="font-bold">Order No:</span> {order.id}</p>
                    {order.deliveryDate && <p><span className="font-bold">Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString()}</p>}
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-1 text-left font-bold">Item Description</th>
                            <th className="border border-black p-1 text-right font-bold">Quantity</th>
                            <th className="border border-black p-1 text-right font-bold">Rate</th>
                            <th className="border border-black p-1 text-right font-bold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => {
                             const total = item.price * item.quantity;
                             return (
                                <tr key={index}>
                                    <td className="border border-black p-1">{item.productName}</td>
                                    <td className="border border-black p-1 text-right">{item.quantity}</td>
                                    <td className="border border-black p-1 text-right">{formatNumber(item.price)}</td>
                                    <td className="border border-black p-1 text-right">{formatNumber(total)}</td>
                                </tr>
                             )
                        })}
                         {/* Spacer rows to push footer down */}
                        {Array.from({ length: Math.max(0, 15 - order.items.length) }).map((_, i) => (
                           <tr key={`spacer-${i}`}><td className="p-3" colSpan={4}></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-xs">
                    {order.paymentTerm === 'Full Payment' && <p><span className="font-bold">Payment Mode:</span> {order.paymentMode}</p>}
                </div>
                <div className="text-right text-xs">
                    <div className="grid grid-cols-2">
                        <p className="font-bold">Subtotal:</p>
                        <p>{formatNumber(subtotal)}</p>
                        {order.isGstInvoice && order.items.map((item, index) => (
                             <React.Fragment key={index}>
                                <p className="font-bold">GST ({item.gst}%) on {formatNumber(item.price * item.quantity)}:</p>
                                <p>{formatNumber(item.price * item.quantity * (item.gst / 100))}</p>
                             </React.Fragment>
                        ))}
                        {order.discount > 0 && (
                            <>
                                <p className="font-bold">Discount:</p>
                                <p>-{formatNumber(order.discount)}</p>
                            </>
                        )}
                        <p className="font-bold border-t border-black mt-1 pt-1">GRAND TOTAL:</p>
                        <p className="font-bold border-t border-black mt-1 pt-1">{formatNumber(order.grandTotal)}</p>
                         {order.paymentTerm === 'Credit' && order.dueDate && (
                             <>
                                <p className="font-bold text-red-600">Amount Due:</p>
                                <p className="font-bold text-red-600">{formatNumber(order.grandTotal)}</p>
                                <p className="font-bold text-red-600">Due Date:</p>
                                <p className="font-bold text-red-600">{new Date(order.dueDate).toLocaleDateString()}</p>
                             </>
                         )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 text-right">
                <p>------------------------</p>
                <p>Authorized Signatory</p>
            </div>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';

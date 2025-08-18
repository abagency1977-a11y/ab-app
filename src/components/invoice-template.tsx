
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
        <div className="w-[210mm] h-auto mx-auto my-0">
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
            <table className="w-full border-collapse text-xs mb-4">
                <tbody>
                    <tr>
                        <td className="w-1/2 p-2 border border-black align-top">
                            <p className="font-bold">Billed to:</p>
                            <p>{customer.name}</p>
                        </td>
                        <td className="w-1/2 p-2 border border-black align-top">
                            <p><span className="font-bold">Date:</span> {new Date(order.orderDate).toLocaleDateString()}</p>
                            <p><span className="font-bold">Invoice No:</span> {order.id.replace('ORD', 'INV')}</p>
                        </td>
                    </tr>
                    <tr>
                        <td className="w-1/2 p-2 border border-black align-top">
                            <p className="font-bold">Delivery Address:</p>
                            <p>{order.deliveryAddress || customer.address}</p>
                        </td>
                        <td className="w-1/2 p-2 border border-black align-top">
                             <p><span className="font-bold">Order No:</span> {order.id}</p>
                            {order.deliveryDate && <p><span className="font-bold">Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString()}</p>}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Items Table */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-1 text-left font-bold w-[50%]">Item Description</th>
                            <th className="border border-black p-1 text-right font-bold w-[15%]">Quantity</th>
                            <th className="border border-black p-1 text-right font-bold w-[15%]">Rate</th>
                            <th className="border border-black p-1 text-right font-bold w-[20%]">Total</th>
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
             <table className="w-full text-xs">
                <tbody>
                    <tr>
                        <td className="w-1/2 align-top">
                             {order.paymentTerm === 'Full Payment' && <p><span className="font-bold">Payment Mode:</span> {order.paymentMode}</p>}
                        </td>
                        <td className="w-1/2">
                            <table className="w-full">
                                <tbody>
                                <tr>
                                    <td className="font-bold text-right pr-4">Subtotal:</td>
                                    <td className="text-right">{formatNumber(subtotal)}</td>
                                </tr>
                                {order.isGstInvoice && order.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="font-bold text-right pr-4">GST ({item.gst}%) on {formatNumber(item.price * item.quantity)}:</td>
                                        <td className="text-right">{formatNumber(item.price * item.quantity * (item.gst / 100))}</td>
                                    </tr>
                                ))}
                                {order.discount > 0 && (
                                    <tr>
                                        <td className="font-bold text-right pr-4">Discount:</td>
                                        <td className="text-right">-{formatNumber(order.discount)}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="font-bold text-right border-t border-black mt-1 pt-1 pr-4">GRAND TOTAL:</td>
                                    <td className="font-bold text-right border-t border-black mt-1 pt-1">{formatNumber(order.grandTotal)}</td>
                                </tr>
                                {order.paymentTerm === 'Credit' && order.dueDate && (
                                    <>
                                        <tr>
                                            <td className="font-bold text-red-600 text-right pr-4">Amount Due:</td>
                                            <td className="font-bold text-red-600 text-right">{formatNumber(order.grandTotal)}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold text-red-600 text-right pr-4">Due Date:</td>
                                            <td className="font-bold text-red-600 text-right">{new Date(order.dueDate).toLocaleDateString()}</td>
                                        </tr>
                                    </>
                                )}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Footer */}
            <div className="mt-auto pt-24 text-right">
                <p>------------------------</p>
                <p>Authorized Signatory</p>
            </div>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';


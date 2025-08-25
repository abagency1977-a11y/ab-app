
'use client';
import React from 'react';
import type { Order, Customer, Payment } from '@/lib/types';

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

interface ReceiptTemplateProps {
  order: Order;
  customer: Customer;
  payment: Payment;
  historicalPayments: Payment[];
  logoUrl?: string;
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, ReceiptTemplateProps>(({ order, customer, payment, historicalPayments, logoUrl }, ref) => {

    const totalPaidInHistory = historicalPayments.reduce((acc, p) => acc + p.amount, 0);
    const balanceDueAfterThisPayment = order.grandTotal - totalPaidInHistory;

  return (
    <div ref={ref} className="bg-white text-black p-6" style={{ width: '148mm', minHeight: '210mm', fontFamily: "'Inter', sans-serif" }}>
        <div className="flex flex-col h-full">
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 text-center">
                        {logoUrl && (
                            <img src={logoUrl} alt="Company Logo" className="h-16 mx-auto" />
                        )}
                        <h2 className="text-xl font-bold mt-2">AB Agency</h2>
                        <p className="text-xs">No.1, Ayyanchery main road, Ayyanchery, Urapakkam</p>
                        <p className="text-xs">Chennai - 603210</p>
                        <p className="text-xs mt-2">MOB: 95511 95505 / 95001 82975</p>
                    </div>
                    <div className="text-right w-1/3">
                        <h2 className="text-3xl font-bold uppercase text-gray-700">Receipt</h2>
                        <p className="mt-1 text-xs"><span className="font-bold">Receipt #:</span> {payment.id.replace(`${order.id}-`, '').replace('PAY', 'RCPT')}</p>
                        <p className="text-xs"><span className="font-bold">Payment Date:</span> {new Date(payment.paymentDate).toLocaleDateString('en-IN')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                    <h3 className="font-bold text-gray-600 mb-1 text-sm">Billed To:</h3>
                    <p className="font-bold text-base">{customer.name}</p>
                    <p className="text-xs">{customer.address}</p>
                    </div>
                    <div className="text-right">
                    <h3 className="font-bold text-gray-600 mb-1 text-sm">Payment Details:</h3>
                    <p className="text-xs">Invoice #: {order.id.replace('ORD', 'INV')}</p>
                    <p className="text-xs">Payment Method: {payment.method}</p>
                    {payment.notes && <p className="text-xs">Notes: {payment.notes}</p>}
                    </div>
                </div>
                
                <div className="text-center my-8">
                    <p className="text-sm text-gray-600">Amount Paid this Transaction</p>
                    <p className="text-3xl font-bold tracking-tight">{formatNumber(payment.amount)}</p>
                </div>


                <table className="w-full text-sm text-left mb-4">
                    <tbody>
                        <tr className="border-t">
                            <td className="p-2">Original Invoice Total</td>
                            <td className="p-2 text-right">{formatNumber(order.grandTotal)}</td>
                        </tr>
                        <tr className="border-t font-bold bg-gray-100">
                            <td className="p-2">Balance Due</td>
                            <td className="p-2 text-right text-red-600">{formatNumber(balanceDueAfterThisPayment)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {historicalPayments && historicalPayments.length > 0 && (
                <div className="mb-4 mt-auto">
                    <h4 className="font-bold text-sm mb-2">Payment History for this Invoice:</h4>
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="p-2">Date</th>
                                <th className="p-2 text-right">Amount Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historicalPayments.map(p => (
                                <tr key={p.id} className="border-b">
                                    <td className="p-2">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                                    <td className="p-2 text-right">{formatNumber(p.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="font-bold">
                                <tr>
                                    <td className="p-2 text-right">Total Paid:</td>
                                    <td className="p-2 text-right">{formatNumber(totalPaidInHistory)}</td>
                                </tr>
                        </tfoot>
                    </table>
                </div>
            )}


            <div className="text-center text-gray-500 text-xs mt-8">
                <p>Thank you for your payment!</p>
                <p>This is a computer-generated receipt and does not require a signature.</p>
            </div>
        </div>
    </div>
  );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';

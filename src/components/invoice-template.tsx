
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

    const invoiceTitle = order.paymentTerm === 'Credit' ? 'CREDIT INVOICE' : 'INVOICE';

    return (
      <div ref={ref} style={{ backgroundColor: 'white', color: 'black', padding: '40px', fontFamily: 'sans-serif', fontSize: '12px', width: '210mm', height: '297mm', boxSizing: 'border-box' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#4A90E2', fontSize: '2.5rem', fontWeight: 'bold', margin: '0' }}>AB AGENCY</h1>
          <p style={{ margin: '0' }}>1, AYYANCHERY MAIN ROAD, AYYANCHERY URAPAKKAM</p>
          <p style={{ margin: '0' }}>Chennai, Tamil Nadu, 603210</p>
          <p style={{ margin: '0' }}>MOB: +91 9551195505 | Email: abagency1977@gmail.com</p>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', textDecoration: 'underline', margin: '0' }}>
            {invoiceTitle}
          </h2>
        </div>

        {/* Customer and Invoice Details Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '11px' }}>
            <tbody>
                <tr>
                    <td style={{ width: '50%', border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                        <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Billed to:</p>
                        <p style={{ margin: '0' }}>{customer.name}</p>
                    </td>
                    <td style={{ width: '50%', border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                        <p style={{ margin: '0 0 4px 0' }}><span style={{ fontWeight: 'bold' }}>Date:</span> {new Date(order.orderDate).toLocaleDateString()}</p>
                        <p style={{ margin: '0' }}><span style={{ fontWeight: 'bold' }}>Invoice No:</span> {order.id.replace('ORD', 'INV')}</p>
                    </td>
                </tr>
                <tr>
                    <td style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                        <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Delivery Address:</p>
                        <p style={{ margin: '0' }}>{order.deliveryAddress || customer.address}</p>
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                        <p style={{ margin: '0 0 4px 0' }}><span style={{ fontWeight: 'bold' }}>Order No:</span> {order.id}</p>
                        {order.deliveryDate && <p style={{ margin: '0' }}><span style={{ fontWeight: 'bold' }}>Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString()}</p>}
                    </td>
                </tr>
            </tbody>
        </table>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead style={{ backgroundColor: '#E5E7EB' }}>
                <tr>
                    <th style={{ border: '1px solid black', padding: '6px', textAlign: 'left', fontWeight: 'bold', width: '55%' }}>Item Description</th>
                    <th style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold', width: '15%' }}>Quantity</th>
                    <th style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold', width: '15%' }}>Rate</th>
                    <th style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold', width: '15%' }}>Total</th>
                </tr>
            </thead>
            <tbody>
                {order.items.map((item, index) => (
                    <tr key={index}>
                        <td style={{ border: '1px solid black', padding: '6px' }}>{item.productName}</td>
                        <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>{formatNumber(item.price)}</td>
                        <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>{formatNumber(item.price * item.quantity)}</td>
                    </tr>
                ))}
                {/* Spacer rows to push footer down */}
                {Array.from({ length: Math.max(0, 15 - order.items.length) }).map((_, i) => (
                   <tr key={`spacer-${i}`}><td colSpan={4} style={{ padding: '16px', borderLeft: '1px solid black', borderRight: '1px solid black' }}></td></tr>
                ))}
            </tbody>
            <tfoot>
              {/* This closing border for the table body */}
               <tr>
                  <td colSpan={4} style={{ borderTop: '1px solid black', padding: 0 }}></td>
               </tr>
            </tfoot>
        </table>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '11px' }}>
            <div style={{ width: '50%', verticalAlign: 'top' }}>
                {order.paymentTerm === 'Full Payment' && <p><span style={{ fontWeight: 'bold' }}>Payment Mode:</span> {order.paymentMode}</p>}
            </div>
            <div style={{ width: '45%' }}>
                <table style={{ width: '100%'}}>
                    <tbody>
                        <tr>
                            <td style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 'bold' }}>Subtotal:</td>
                            <td style={{ textAlign: 'right', padding: '2px 8px', width: '40%' }}>{formatNumber(subtotal)}</td>
                        </tr>
                        {order.isGstInvoice && order.items.map((item, index) => {
                            if(item.gst > 0) {
                                return (
                                    <tr key={index}>
                                        <td style={{ textAlign: 'right', padding: '2px 8px' }}>GST ({item.gst}%) on {formatNumber(item.price * item.quantity)}:</td>
                                        <td style={{ textAlign: 'right', padding: '2px 8px' }}>{formatNumber(item.price * item.quantity * (item.gst / 100))}</td>
                                    </tr>
                                )
                            }
                            return null;
                        })}
                        {order.discount > 0 && (
                            <tr>
                                <td style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 'bold' }}>Discount:</td>
                                <td style={{ textAlign: 'right', padding: '2px 8px' }}>-{formatNumber(order.discount)}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ textAlign: 'right', padding: '8px 8px 2px 8px', fontWeight: 'bold', borderTop: '1px solid black' }}>GRAND TOTAL:</td>
                            <td style={{ textAlign: 'right', padding: '8px 8px 2px 8px', fontWeight: 'bold', borderTop: '1px solid black' }}>{formatNumber(order.grandTotal)}</td>
                        </tr>
                        {order.paymentTerm === 'Credit' && order.dueDate && (
                            <>
                                <tr>
                                    <td style={{ color: 'red', textAlign: 'right', padding: '2px 8px', fontWeight: 'bold' }}>Amount Due:</td>
                                    <td style={{ color: 'red', textAlign: 'right', padding: '2px 8px', fontWeight: 'bold' }}>{formatNumber(order.grandTotal)}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: 'red', textAlign: 'right', padding: '2px 8px', fontWeight: 'bold' }}>Due Date:</td>
                                    <td style={{ color: 'red', textAlign: 'right', padding: '2px 8px', fontWeight: 'bold' }}>{new Date(order.dueDate).toLocaleDateString()}</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '40px', right: '40px', textAlign: 'right' }}>
            <p style={{marginBottom: '0.5rem'}}>------------------------</p>
            <p style={{margin: '0'}}>Authorized Signatory</p>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';

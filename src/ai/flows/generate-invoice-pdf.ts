'use server';
/**
 * @fileOverview A flow to generate an invoice PDF by filling a template.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { PDFDocument } from 'pdf-lib';
import fetch from 'node-fetch';
import type { Order, Customer } from '@/lib/types';

const GenerateInvoicePdfInputSchema = z.object({
  order: z.any().describe('The order object.'),
  customer: z.any().describe('The customer object.'),
});

export type GenerateInvoicePdfInput = z.infer<typeof GenerateInvoicePdfInputSchema>;

const GenerateInvoicePdfOutputSchema = z.object({
  pdfBase64: z.string().describe('The generated PDF as a Base64 encoded string.'),
});

export type GenerateInvoicePdfOutput = z.infer<typeof GenerateInvoicePdfOutputSchema>;

// Corrected direct download links for Google Drive
const TEMPLATES = {
    'Credit': 'https://drive.google.com/uc?export=download&id=1aN5Fl7ne11WbWFR8plC2q5XGFSyGjYKS',
    'Full Payment': 'https://drive.google.com/uc?export=download&id=1-P5Pf-9MhTCYMCv1pxbYSUKgetkxCDBH'
};

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

// Helper function to safely set text field value
const setTextField = (form: any, fieldName: string, value: string | undefined) => {
    try {
        const field = form.getTextField(fieldName);
        if (field && value) {
            field.setText(value);
        }
    } catch (e) {
        console.warn(`Could not find or set form field: ${fieldName}`);
    }
}

export async function generateInvoicePdfFlow(input: GenerateInvoicePdfInput): Promise<GenerateInvoicePdfOutput> {
    const { order, customer } = input as { order: Order, customer: Customer };
    const templateUrl = TEMPLATES[order.paymentTerm];
    if (!templateUrl) {
      throw new Error(`No template found for payment term: ${order.paymentTerm}`);
    }

    const templateBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalGst = order.isGstInvoice ? order.items.reduce((acc, item) => acc + (item.price * item.quantity * (item.gst / 100)), 0) : 0;

    // Fill fields safely
    setTextField(form, 'billed_to', customer.name);
    setTextField(form, 'delivery_address', order.deliveryAddress || customer.address);
    setTextField(form, 'date', new Date(order.orderDate).toLocaleDateString());
    setTextField(form, 'invoice_no', order.id.replace('ORD', 'INV'));
    setTextField(form, 'order_no', order.id);
    if (order.deliveryDate) {
        setTextField(form, 'delivery_date', new Date(order.deliveryDate).toLocaleDateString());
    }

    order.items.forEach((item, index) => {
        const i = index + 1;
        setTextField(form, `item_${i}_desc`, item.productName);
        setTextField(form, `item_${i}_qty`, String(item.quantity));
        setTextField(form, `item_${i}_rate`, formatNumber(item.price));
        setTextField(form, `item_${i}_total`, formatNumber(item.price * item.quantity));
    });
    
    setTextField(form, 'subtotal', formatNumber(subtotal));

    if (order.isGstInvoice) {
        setTextField(form, 'total_gst', formatNumber(totalGst));
    }

    if (order.discount > 0) {
      setTextField(form, 'discount', formatNumber(order.discount));
    }
    
    setTextField(form, 'grand_total', formatNumber(order.grandTotal));

    if (order.paymentTerm === 'Full Payment' && order.paymentMode) {
        setTextField(form, 'payment_mode', order.paymentMode);
    }
    
    if (order.paymentTerm === 'Credit' && order.dueDate) {
      setTextField(form, 'amount_due', formatNumber(order.grandTotal));
      setTextField(form, 'due_date', new Date(order.dueDate).toLocaleDateString());
    }

    form.flatten(); // This makes the fields non-editable in the final PDF

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    return { pdfBase64 };
}

export const generateInvoicePdf = ai.defineFlow(
  {
    name: 'generateInvoicePdf',
    inputSchema: GenerateInvoicePdfInputSchema,
    outputSchema: GenerateInvoicePdfOutputSchema,
  },
  generateInvoicePdfFlow
);

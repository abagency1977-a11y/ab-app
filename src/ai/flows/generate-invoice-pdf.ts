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

const TEMPLATES = {
    'Credit': 'https://drive.google.com/uc?export=download&id=1aN5Fl7ne11WbWFR8plC2q5XGFSyGjYKS',
    'Full Payment': 'https://drive.google.com/uc?export=download&id=1-P5Pf-9MhTCYMCv1pxbYSUKgetkxCDBH'
};

const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.00';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

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

    // Fill fields
    form.getTextField('billed_to').setText(customer.name);
    form.getTextField('delivery_address').setText(order.deliveryAddress || customer.address);
    form.getTextField('date').setText(new Date(order.orderDate).toLocaleDateString());
    form.getTextField('invoice_no').setText(order.id.replace('ORD', 'INV'));
    form.getTextField('order_no').setText(order.id);
    if(order.deliveryDate) {
        form.getTextField('delivery_date').setText(new Date(order.deliveryDate).toLocaleDateString());
    }

    order.items.forEach((item, index) => {
        const i = index + 1;
        form.getTextField(`item_${i}_desc`).setText(item.productName);
        form.getTextField(`item_${i}_qty`).setText(String(item.quantity));
        form.getTextField(`item_${i}_rate`).setText(formatNumber(item.price));
        form.getTextField(`item_${i}_total`).setText(formatNumber(item.price * item.quantity));
    });
    
    form.getTextField('subtotal').setText(formatNumber(subtotal));

    if(order.isGstInvoice) {
        form.getTextField('total_gst').setText(formatNumber(totalGst));
    }

    if (order.discount > 0) {
      form.getTextField('discount').setText(formatNumber(order.discount));
    }
    
    form.getTextField('grand_total').setText(formatNumber(order.grandTotal));

    if(order.paymentTerm === 'Full Payment' && order.paymentMode) {
        form.getTextField('payment_mode').setText(order.paymentMode);
    }
    
    if (order.paymentTerm === 'Credit' && order.dueDate) {
      form.getTextField('amount_due').setText(formatNumber(order.grandTotal));
      form.getTextField('due_date').setText(new Date(order.dueDate).toLocaleDateString());
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

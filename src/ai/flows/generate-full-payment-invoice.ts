
'use server';

/**
 * @fileOverview Generates invoices for orders that have been paid in full.
 *
 * - generateFullPaymentInvoice - A function that handles the invoice generation process.
 * - GenerateFullPaymentInvoiceInput - The input type for the generateFullPaymentInvoice function.
 * - GenerateFullPaymentInvoiceOutput - The return type for the generateFullPaymentInvoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFullPaymentInvoiceInputSchema = z.object({
  orderData: z.string().describe('The line items of the order to generate the invoice from, pre-formatted to fit in the table.'),
  customerName: z.string().describe('The name of the customer.'),
  customerAddress: z.string().describe('The address of the customer.'),
  invoiceNumber: z.string().describe('The invoice number.'),
  invoiceDate: z.string().describe('The invoice date.'),
  companyName: z.string().describe('The name of the company.'),
  companyAddress: z.string().describe('The address of the company.'),
  grandTotal: z.number().describe('The total amount of the order.'),
  paymentMode: z.string().describe('The mode of payment used (e.g., Cash, Card).'),
  orderId: z.string().describe('The order ID.'),
  deliveryDate: z.string().optional().describe('The delivery date.'),
});
export type GenerateFullPaymentInvoiceInput = z.infer<typeof GenerateFullPaymentInvoiceInputSchema>;

const GenerateFullPaymentInvoiceOutputSchema = z.object({
  invoice: z.string().describe('The generated invoice text.'),
});
export type GenerateFullPaymentInvoiceOutput = z.infer<typeof GenerateFullPaymentInvoiceOutputSchema>;

export async function generateFullPaymentInvoice(input: GenerateFullPaymentInvoiceInput): Promise<GenerateFullPaymentInvoiceOutput> {
  return generateFullPaymentInvoiceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFullPaymentInvoicePrompt',
  input: {schema: GenerateFullPaymentInvoiceInputSchema},
  output: {schema: GenerateFullPaymentInvoiceOutputSchema},
  prompt: `
  You are an expert accountant. Generate a professional INVOICE for a FULLY PAID order.
  The invoice must be clearly marked as "INVOICE".
  Format the output exactly as shown in the structure below.
  Use a monospaced font format. The orderData is pre-formatted, just insert it.

  +--------------------------------------------------------------------------------+
  |                                   AB AGENCY                                    |
  |                1, AYYANCHERY MAIN ROAD, AYYANCHERY URAPAKKAM                     |
  |                   Chennai, Tamil Nadu, 603210                                  |
  |              MOB: +91 9551195505 | Email: abagency1977@gmail.com               |
  +--------------------------------------------------------------------------------+
  |                                    INVOICE                                     |
  +--------------------------------------------------------------------------------+
  | Billed to:                        | Date:           {{{invoiceDate}}}          |
  | {{{customerName}}}               | Invoice No:     {{{invoiceNumber}}}        |
  |                                   | Order No:       {{{orderId}}}              |
  | Delivery Address:                 | Delivery Date:  {{{deliveryDate}}}         |
  | {{{customerAddress}}}             |                                            |
  +--------------------------------------------------------------------------------+
  | Item Description                      | Quantity |      Rate |         Total  |
  +--------------------------------------------------------------------------------+
{{{orderData}}}
  +--------------------------------------------------------------------------------+
  | Payment Mode: {{{paymentMode}}}         | Subtotal:                 |    {{{grandTotal}}}  |
  |                                     | Total GST:                |        0.00  |
  |                                     | Discount:                 |        0.00  |
  |                                     +------------------------------------------+
  |                                     | GRAND TOTAL:              |    {{{grandTotal}}}  |
  +--------------------------------------------------------------------------------+
  |                                                       Authorized Signatory   |
  +--------------------------------------------------------------------------------+
  `,
});

const generateFullPaymentInvoiceFlow = ai.defineFlow(
  {
    name: 'generateFullPaymentInvoiceFlow',
    inputSchema: GenerateFullPaymentInvoiceInputSchema,
    outputSchema: GenerateFullPaymentInvoiceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


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
  orderData: z.string().describe('The line items of the order to generate the invoice from.'),
  customerName: z.string().describe('The name of the customer.'),
  customerAddress: z.string().describe('The address of the customer.'),
  invoiceNumber: z.string().describe('The invoice number.'),
  invoiceDate: z.string().describe('The invoice date.'),
  companyName: z.string().describe('The name of the company.'),
  companyAddress: z.string().describe('The address of the company.'),
  grandTotal: z.number().describe('The total amount of the order.'),
  paymentMode: z.string().describe('The mode of payment used (e.g., Cash, Card).'),
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
  prompt: `You are an accounting assistant. Generate a professional invoice for a FULLY PAID order.
  The invoice should be clearly marked as "PAID IN FULL".

  Company Name: {{{companyName}}}
  Company Address: {{{companyAddress}}}

  Invoice To:
  {{{customerName}}}
  {{{customerAddress}}}

  Invoice Number: {{{invoiceNumber}}}
  Invoice Date: {{{invoiceDate}}}

  Items:
  {{{orderData}}}

  ---
  Grand Total: {{{grandTotal}}}
  Payment Mode: {{{paymentMode}}}
  Status: PAID IN FULL
  ---

  Please format the invoice clearly.
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

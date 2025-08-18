'use server';

/**
 * @fileOverview Generates invoices from order data.
 *
 * - generateInvoice - A function that handles the invoice generation process.
 * - GenerateInvoiceInput - The input type for the generateInvoice function.
 * - GenerateInvoiceOutput - The return type for the generateInvoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInvoiceInputSchema = z.object({
  orderData: z.string().describe('The order data to generate the invoice from.'),
  customerName: z.string().describe('The name of the customer.'),
  customerAddress: z.string().describe('The address of the customer.'),
  invoiceNumber: z.string().describe('The invoice number.'),
  invoiceDate: z.string().describe('The invoice date.'),
  companyName: z.string().describe('The name of the company.'),
  companyAddress: z.string().describe('The address of the company.'),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

const GenerateInvoiceOutputSchema = z.object({
  invoice: z.string().describe('The generated invoice.'),
});
export type GenerateInvoiceOutput = z.infer<typeof GenerateInvoiceOutputSchema>;

export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
  return generateInvoiceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInvoicePrompt',
  input: {schema: GenerateInvoiceInputSchema},
  output: {schema: GenerateInvoiceOutputSchema},
  prompt: `You are an accounting assistant. You will generate an invoice based on the provided order data. The invoice should include the customer name, customer address, invoice number, invoice date, company name, company address, and the order details.

  Customer Name: {{{customerName}}}
  Customer Address: {{{customerAddress}}}
  Invoice Number: {{{invoiceNumber}}}
  Invoice Date: {{{invoiceDate}}}
  Company Name: {{{companyName}}}
  Company Address: {{{companyAddress}}}
  Order Data: {{{orderData}}}
  \n  Please generate the invoice in a readable format.
  `,
});

const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

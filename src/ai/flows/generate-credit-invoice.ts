'use server';

/**
 * @fileOverview Generates credit invoices for orders.
 *
 * - generateCreditInvoice - A function that handles the credit invoice generation process.
 * - GenerateCreditInvoiceInput - The input type for the generateCreditInvoice function.
 * - GenerateCreditInvoiceOutput - The return type for the generateCreditInvoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCreditInvoiceInputSchema = z.object({
  orderData: z.string().describe('The line items of the order to generate the invoice from.'),
  customerName: z.string().describe('The name of the customer.'),
  customerAddress: z.string().describe('The address of the customer.'),
  invoiceNumber: z.string().describe('The invoice number.'),
  invoiceDate: z.string().describe('The invoice date.'),
  dueDate: z.string().describe('The date the payment is due.'),
  companyName: z.string().describe('The name of the company.'),
  companyAddress: z.string().describe('The address of the company.'),
  grandTotal: z.number().describe('The total amount of the order.'),
});
export type GenerateCreditInvoiceInput = z.infer<typeof GenerateCreditInvoiceInputSchema>;

const GenerateCreditInvoiceOutputSchema = z.object({
  invoice: z.string().describe('The generated credit invoice text.'),
});
export type GenerateCreditInvoiceOutput = z.infer<typeof GenerateCreditInvoiceOutputSchema>;

export async function generateCreditInvoice(input: GenerateCreditInvoiceInput): Promise<GenerateCreditInvoiceOutput> {
  return generateCreditInvoiceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCreditInvoicePrompt',
  input: {schema: GenerateCreditInvoiceInputSchema},
  output: {schema: GenerateCreditInvoiceOutputSchema},
  prompt: `You are an accounting assistant. Generate a professional CREDIT invoice.
  The invoice must clearly state the "Amount Due" and the "Due Date".

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
  Amount Due: {{{grandTotal}}}
  Due Date: {{{dueDate}}}
  ---

  Please format the invoice clearly.
  `,
});

const generateCreditInvoiceFlow = ai.defineFlow(
  {
    name: 'generateCreditInvoiceFlow',
    inputSchema: GenerateCreditInvoiceInputSchema,
    outputSchema: GenerateCreditInvoiceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

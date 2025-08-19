'use server';

/**
 * @fileOverview Receipt generation AI agent.
 *
 * - generateReceipt - A function that handles the receipt generation process.
 * - GenerateReceiptInput - The input type for the generateReceipt function.
 * - GenerateReceiptOutput - The return type for the generateReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Order, Customer, Payment } from '@/lib/types';


const GenerateReceiptInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  invoiceId: z.string().describe('The ID of the invoice this payment is for.'),
  payment: z.object({
    id: z.string(),
    paymentDate: z.string(),
    amount: z.number(),
    method: z.string(),
  }),
  invoiceTotal: z.number().describe('The grand total of the invoice.'),
  balanceDueAfterPayment: z.number().describe('The remaining balance on the invoice after this payment was made.'),
});
export type GenerateReceiptInput = z.infer<typeof GenerateReceiptInputSchema>;

const GenerateReceiptOutputSchema = z.object({
  receipt: z.string().describe('The generated receipt in a readable, formatted text string.'),
});
export type GenerateReceiptOutput = z.infer<typeof GenerateReceiptOutputSchema>;


export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  return generateReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReceiptPrompt',
  input: {schema: GenerateReceiptInputSchema},
  output: {schema: GenerateReceiptOutputSchema},
  prompt: `You are an accounting assistant. Generate a clear and simple receipt for a payment transaction.

  **Payment Receipt**

  --------------------------------
  **Customer:** {{{customerName}}}
  **Invoice ID:** {{{invoiceId}}}
  --------------------------------

  **Payment Details:**
  - **Payment ID:** {{{payment.id}}}
  - **Payment Date:** {{{payment.paymentDate}}}
  - **Amount Paid:** {{{payment.amount}}}
  - **Payment Method:** {{{payment.method}}}

  **Invoice Summary:**
  - **Original Invoice Total:** {{{invoiceTotal}}}
  - **Balance Due After this Payment:** {{{balanceDueAfterPayment}}}

  --------------------------------
  Thank you for your payment.
  This is an official receipt for the amount paid.
  `,
});


const generateReceiptFlow = ai.defineFlow(
  {
    name: 'generateReceiptFlow',
    inputSchema: GenerateReceiptInputSchema,
    outputSchema: GenerateReceiptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

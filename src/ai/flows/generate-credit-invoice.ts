
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
  companyName: z.string().describe('The name of the company.'),
  companyAddress: z.string().describe('The address of the company.'),
  grandTotal: z.number().describe('The total amount of the order.'),
  dueDate: z.string().describe('The due date for the payment.'),
  orderId: z.string().describe('The order ID.'),
  deliveryDate: z.string().optional().describe('The delivery date.'),
});
export type GenerateCreditInvoiceInput = z.infer<typeof GenerateCreditInvoiceInputSchema>;

const GenerateCreditInvoiceOutputSchema = z.object({
  invoice: z.string().describe('The generated invoice text.'),
});
export type GenerateCreditInvoiceOutput = z.infer<typeof GenerateCreditInvoiceOutputSchema>;

export async function generateCreditInvoice(input: GenerateCreditInvoiceInput): Promise<GenerateCreditInvoiceOutput> {
  return generateCreditInvoiceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCreditInvoicePrompt',
  input: {schema: GenerateCreditInvoiceInputSchema},
  output: {schema: GenerateCreditInvoiceOutputSchema},
  prompt: `
  You are an expert accountant. Generate a professional CREDIT INVOICE.
  The invoice must be clearly marked as "CREDIT INVOICE" and must include a due date.
  Format the output exactly as shown in the structure below. Use a monospaced font format.

  +--------------------------------------------------------------------------+
  |                                AB AGENCY                                 |
  |             1, AYYANCHERY MAIN ROAD, AYYANCHERY URAPAKKAM                  |
  |                Chennai, Tamil Nadu, 603210                               |
  |           MOB: +91 9551195505 | Email: abagency1977@gmail.com            |
  +--------------------------------------------------------------------------+
  |                              CREDIT INVOICE                              |
  +--------------------------------------------------------------------------+
  | Billed to:                      | Date: {{{invoiceDate}}}                |
  | {{{customerName}}}              | Invoice No: {{{invoiceNumber}}}        |
  |                                 | Order No: {{{orderId}}}                |
  | Delivery Address:               | Delivery Date: {{{deliveryDate}}}     |
  | {{{customerAddress}}}           |                                        |
  +--------------------------------------------------------------------------+
  | Item Description                | Quantity |      Rate |         Total |
  +--------------------------------------------------------------------------+
{{{orderData}}}
  +--------------------------------------------------------------------------+
  |                                     | Subtotal:       | {{{grandTotal}}} |
  |                                     | Total GST:      | 0.00             |
  |                                     | Discount:       | 0.00             |
  |                                     +------------------------------------+
  |                                     | GRAND TOTAL:    | {{{grandTotal}}} |
  |                                     | Amount Due:     | {{{grandTotal}}} |
  |                                     | Due Date:       | {{{dueDate}}}    |
  +--------------------------------------------------------------------------+
  |                                                  Authorized Signatory  |
  +--------------------------------------------------------------------------+
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

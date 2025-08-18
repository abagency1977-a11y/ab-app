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
  orderData: z.string().describe('The line items of the order to generate the invoice from. Each item should be on a new line and pre-formatted to fit the table layout.'),
  customerName: z.string().describe('The name of the customer.'),
  customerAddress: z.string().describe('The address of the customer.'),
  invoiceNumber: z.string().describe('The invoice number.'),
  invoiceDate: z.string().describe('The invoice date.'),
  companyName: z.string().describe('The name of the company.'),
  companyAddress: z.string().describe('The address of the company.'),
  grandTotal: z.number().describe('The final total amount of the order after discounts.'),
  paymentMode: z.string().describe('The mode of payment used (e.g., Cash, Card).'),
  discount: z.number().describe('The discount amount.'),
  orderId: z.string().describe('The original order ID.'),
  deliveryDate: z.string().optional().describe('The delivery date.'),
});
export type GenerateFullPaymentInvoiceInput = z.infer<typeof GenerateFullPaymentInvoiceInputSchema>;

const GenerateFullPaymentInvoiceOutputSchema = z.object({
  invoice: z.string().describe('The generated invoice text, formatted to match the provided layout.'),
});
export type GenerateFullPaymentInvoiceOutput = z.infer<typeof GenerateFullPaymentInvoiceOutputSchema>;

export async function generateFullPaymentInvoice(input: GenerateFullPaymentInvoiceInput): Promise<GenerateFullPaymentInvoiceOutput> {
  return generateFullPaymentInvoiceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFullPaymentInvoicePrompt',
  input: {schema: GenerateFullPaymentInvoiceInputSchema},
  output: {schema: GenerateFullPaymentInvoiceOutputSchema},
  prompt: `You are an expert accountant. Your task is to generate a professional invoice for a FULLY PAID order.
You MUST replicate the provided format EXACTLY using plain text, spaces, and the characters +, -, and |. Do not deviate from the structure.

**Strict Format to Follow:**

                              AB AGENCY
        1, AYYANCHERY MAIN ROAD, AYYANCHERY URAPAKKAM
                     Chennai, Tamil Nadu, 603210
                       MOB: +91 9551195505
                    Email: abagency1977@gmail.com

                                INVOICE

+-------------------------------------+--------------------------------+
| Billed to:                          | Date: {{{invoiceDate}}}
| {{{customerName}}}                  | Invoice No: {{{invoiceNumber}}}
+-------------------------------------+--------------------------------+
| Delivery Address:                   | Order No: {{{orderId}}}
| {{{customerAddress}}}                   | Delivery Date: {{{deliveryDate}}}
+-------------------------------------+--------------------------------+
| Item Description               | Quantity | Rate     | Total      |
+--------------------------------+----------+----------+------------+
{{{orderData}}}
+--------------------------------+----------+----------+------------+
                                                    Subtotal: {{{subtotal}}}
                                                    Discount: {{{discount}}}
                                                 GRAND TOTAL: {{{grandTotal}}}


Payment Mode: {{{paymentMode}}}


                                                    ------------------------
                                                    Authorized Signatory

**Instructions:**
-   The 'orderData' variable is ALREADY FORMATTED. You must insert it directly into the table without modification.
-   Calculate 'Subtotal' by adding the 'grandTotal' and 'discount' values.
-   Use the exact labels like "Billed to:", "Invoice No:", "GRAND TOTAL".
-   Ensure all alignment (centering, right-alignment) is done with spaces.
-   The final output must be a single string.

**Invoice Data:**
-   Customer Name: {{{customerName}}}
-   Delivery Address: {{{customerAddress}}}
-   Invoice Date: {{{invoiceDate}}}
-   Invoice Number: {{{invoiceNumber}}}
-   Order ID: {{{orderId}}}
-   Delivery Date: {{{deliveryDate}}}
-   Order Items (pre-formatted):
{{{orderData}}}
-   Discount: {{{discount}}}
-   Grand Total: {{{grandTotal}}}
-   Payment Mode: {{{paymentMode}}}
  `,
});

const generateFullPaymentInvoiceFlow = ai.defineFlow(
  {
    name: 'generateFullPaymentInvoiceFlow',
    inputSchema: GenerateFullPaymentInvoiceInputSchema,
    outputSchema: GenerateFullPaymentInvoiceOutputSchema,
  },
  async (input) => {
    const subtotal = input.grandTotal + input.discount;
    const {output} = await prompt({...input, subtotal});
    return output!;
  }
);

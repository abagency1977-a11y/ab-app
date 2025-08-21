
'use server';

/**
 * @fileOverview Bulk payment allocation AI agent.
 *
 * - allocateBulkPayment - A function that handles the bulk payment allocation process.
 * - AllocateBulkPaymentInput - The input type for the allocateBulkPayment function.
 * - AllocateBulkPaymentOutput - The return type for the allocateBulkPayment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Order } from '@/lib/types';

const OutstandingInvoiceSchema = z.object({
  id: z.string().describe("The ID of the invoice to apply payment to."),
  orderDate: z.string(),
  balanceDue: z.number().describe("The outstanding balance of this specific invoice."),
  grandTotal: z.number(),
});

const AllocateBulkPaymentInputSchema = z.object({
  customerId: z.string().describe('The ID of the customer making the payment.'),
  paymentAmount: z.number().describe('The total amount of the payment received.'),
  paymentDate: z.string().describe('The date the payment was received.'),
  paymentMethod: z.string().describe('The method of payment (e.g., Cash, UPI).'),
  invoicesToPay: z.array(OutstandingInvoiceSchema).describe("A list of the specific invoices the user has selected to apply the payment towards."),
});
export type AllocateBulkPaymentInput = z.infer<typeof AllocateBulkPaymentInputSchema>;

const AllocatedPaymentSchema = z.object({
    invoiceId: z.string().describe("The ID of the invoice the payment is being applied to."),
    amountAllocated: z.number().describe("The portion of the bulk payment allocated to this specific invoice."),
    newBalanceDue: z.number().describe("The remaining balance on this invoice after the allocation."),
    newStatus: z.string().describe('The new status of the invoice after payment (e.g., "Fulfilled", "Pending").'),
});

const AllocateBulkPaymentOutputSchema = z.object({
  allocations: z.array(AllocatedPaymentSchema).describe('A list of how the payment was allocated across the selected invoices.'),
  remainingCredit: z.number().describe("The amount of payment left over after settling the selected invoices. This can be used as a credit for the customer."),
  summary: z.string().describe("A brief, human-readable summary of the allocation process. e.g. 'Allocated 5000 to INV-001 and 1000 to INV-002, with 0 remaining.'"),
});
export type AllocateBulkPaymentOutput = z.infer<typeof AllocateBulkPaymentOutputSchema>;


export async function allocateBulkPayment(input: AllocateBulkPaymentInput): Promise<AllocateBulkPaymentOutput> {
  return allocateBulkPaymentFlow(input);
}


const prompt = ai.definePrompt({
  name: 'allocateBulkPaymentPrompt',
  input: {schema: AllocateBulkPaymentInputSchema},
  output: {schema: AllocateBulkPaymentOutputSchema},
  prompt: `You are an intelligent accounting assistant responsible for allocating bulk payments from customers to their outstanding invoices.

A customer has made a payment of {{{paymentAmount}}} via {{{paymentMethod}}} on {{{paymentDate}}}.

The user has explicitly chosen to apply this payment to the following invoices:
{{#each invoicesToPay}}
- Invoice ID: {{id}}, Due: {{balanceDue}}, Total: {{grandTotal}}, Date: {{orderDate}}
{{/each}}

Your task is to apply the payment amount to these selected invoices.

1.  For each selected invoice, determine how much of the payment can be applied. The payment should fully clear an invoice before moving to the next one in the provided list.
2.  Calculate the new balance due for each invoice.
3.  Determine the new status for each invoice. If the new balance is 0 or less, the status should be "Fulfilled". Otherwise, it remains "Pending".
4.  Keep track of the remaining payment amount as you allocate it.
5.  If there is any payment amount left after clearing all selected invoices, this is the remaining credit.
6.  Provide a clear summary of the allocations.

Return the result in the specified JSON format.
`,
});

const allocateBulkPaymentFlow = ai.defineFlow(
  {
    name: 'allocateBulkPaymentFlow',
    inputSchema: AllocateBulkPaymentInputSchema,
    outputSchema: AllocateBulkPaymentOutputSchema,
  },
  async input => {
    if (input.invoicesToPay.length === 0) {
        return {
            allocations: [],
            remainingCredit: input.paymentAmount,
            summary: `No invoices were selected to apply payment to. A credit of ${input.paymentAmount} has been recorded.`
        }
    }
    
    const {output} = await prompt(input);
    return output!;
  }
);

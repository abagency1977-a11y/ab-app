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

const GenerateReceiptInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  items: z
    .array(
      z.object({
        name: z.string().describe('The name of the item.'),
        quantity: z.number().describe('The quantity of the item.'),
        price: z.number().describe('The price of the item.'),
      })
    )
    .describe('The list of items purchased.'),
  totalAmount: z.number().describe('The total amount paid by the customer.'),
  date: z.string().describe('The date of the transaction.'),
  transactionId: z.string().describe('The unique identifier for the transaction.'),
});
export type GenerateReceiptInput = z.infer<typeof GenerateReceiptInputSchema>;

const GenerateReceiptOutputSchema = z.object({
  receipt: z.string().describe('The generated receipt in a readable format.'),
});
export type GenerateReceiptOutput = z.infer<typeof GenerateReceiptOutputSchema>;

export async function generateReceipt(input: GenerateReceiptInput): Promise<GenerateReceiptOutput> {
  return generateReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReceiptPrompt',
  input: {schema: GenerateReceiptInputSchema},
  output: {schema: GenerateReceiptOutputSchema},
  prompt: `You are an accounting assistant. Generate a receipt for the following transaction.

  Customer Name: {{{customerName}}}
  Date: {{{date}}}
  Transaction ID: {{{transactionId}}}

  Items:
  {{#each items}}
  - {{{quantity}}} x {{{name}}} @ {{{price}}}
  {{/each}}

  Total Amount: {{{totalAmount}}}

  Please format the receipt in a clear and readable manner.
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

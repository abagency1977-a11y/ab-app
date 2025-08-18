'use server';

/**
 * @fileOverview An AI agent to predict product demand based on historical order data.
 *
 * - predictProductDemand - Predicts the amount of product needed based on prior orders.
 * - PredictProductDemandInput - The input type for the predictProductDemand function.
 * - PredictProductDemandOutput - The return type for the predictProductDemand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictProductDemandInputSchema = z.object({
  productName: z.string().describe('The name of the product to predict demand for.'),
  historicalOrderData: z.string().describe(
    'Historical order data for the product, in JSON format.  Must be an array of objects, each with a date and quantity field.'
  ),
});
export type PredictProductDemandInput = z.infer<typeof PredictProductDemandInputSchema>;

const PredictProductDemandOutputSchema = z.object({
  predictedDemand: z
    .number()
    .describe('The predicted demand for the product in the next period.'),
  rationale: z
    .string()
    .describe('The rationale behind the predicted demand, explaining the factors considered.'),
});
export type PredictProductDemandOutput = z.infer<typeof PredictProductDemandOutputSchema>;

export async function predictProductDemand(
  input: PredictProductDemandInput
): Promise<PredictProductDemandOutput> {
  return predictProductDemandFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictProductDemandPrompt',
  input: {schema: PredictProductDemandInputSchema},
  output: {schema: PredictProductDemandOutputSchema},
  prompt: `You are an expert inventory analyst.  Given the historical order data for a product,
you will predict the demand for the product in the next period.  Provide a rationale for your prediction.

Product Name: {{productName}}
Historical Order Data:
{{historicalOrderData}}`,
});

const predictProductDemandFlow = ai.defineFlow(
  {
    name: 'predictProductDemandFlow',
    inputSchema: PredictProductDemandInputSchema,
    outputSchema: PredictProductDemandOutputSchema,
  },
  async input => {
    try {
      // Parse the historical order data to ensure it's valid JSON.
      JSON.parse(input.historicalOrderData);
    } catch (e: any) {
      throw new Error(
        `Invalid historicalOrderData: ${e.message}.  Must be a valid JSON string of an array of objects with date and quantity fields.`
      );
    }
    const {output} = await prompt(input);
    return output!;
  }
);


import { config } from 'dotenv';
config();

import '@/ai/flows/generate-report-narrative.ts';
import '@/ai/flows/predict-product-demand.ts';
import '@/ai/flows/generate-receipt.ts';
import '@/ai/flows/generate-full-payment-invoice.ts';
import '@/ai/flows/generate-credit-invoice.ts';

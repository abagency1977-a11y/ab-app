
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-report-narrative.ts';
import '@/ai/flows/predict-product-demand.ts';
import '@/ai/flows/generate-receipt.ts';
import '@/ai/flows/generate-invoice-pdf.ts';
import '@/ai/flows/allocate-bulk-payment.ts';



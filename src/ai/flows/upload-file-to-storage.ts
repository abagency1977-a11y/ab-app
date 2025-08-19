'use server';
/**
 * @fileOverview A flow to download a file from a URL and save it to local storage.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const UploadFileToStorageInputSchema = z.object({
  url: z.string().describe('The public URL of the file to download.'),
  fileName: z.string().describe('The name to save the file as in local storage.'),
});
export type UploadFileToStorageInput = z.infer<typeof UploadFileToStorageInputSchema>;

const UploadFileToStorageOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  filePath: z.string().optional(),
});
export type UploadFileToStorageOutput = z.infer<typeof UploadFileToStorageOutputSchema>;

async function uploadFileToStorageFlow(input: UploadFileToStorageInput): Promise<UploadFileToStorageOutput> {
  const { url, fileName } = input;
  
  try {
    // Correct Google Drive URL for direct download
    const downloadUrl = url.replace('/view?usp=drive_link', '&export=download');

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${url}. Status: ${response.statusText}`);
    }
    
    const fileBuffer = await response.arrayBuffer();

    const templatesDir = path.join(process.cwd(), 'public', 'templates');
    
    // Ensure the directory exists
    await fs.mkdir(templatesDir, { recursive: true });

    const filePath = path.join(templatesDir, fileName);
    await fs.writeFile(filePath, Buffer.from(fileBuffer));

    return {
      success: true,
      message: `File '${fileName}' uploaded successfully.`,
      filePath,
    };

  } catch (error: any) {
    console.error('Error in uploadFileToStorageFlow:', error);
    return {
      success: false,
      message: error.message || 'An unknown error occurred.',
    };
  }
}

export const uploadFileToStorage = ai.defineFlow(
  {
    name: 'uploadFileToStorage',
    inputSchema: UploadFileToStorageInputSchema,
    outputSchema: UploadFileToStorageOutputSchema,
  },
  uploadFileToStorageFlow
);

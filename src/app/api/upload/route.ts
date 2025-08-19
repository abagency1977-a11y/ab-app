
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { formidable, errors as formidableErrors } from 'formidable';
import type { NextApiRequest } from 'next';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

const TEMPLATES_DIR = path.join(process.cwd(), 'public', 'templates');

// Helper function to ensure the templates directory exists
async function ensureTemplatesDirExists() {
    try {
        await fs.access(TEMPLATES_DIR);
    } catch {
        await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    }
}

export async function POST(req: Request) {
    await ensureTemplatesDirExists();
    
    const form = formidable({
        uploadDir: TEMPLATES_DIR,
        keepExtensions: true,
        filename: (name, ext, part) => {
            // formidable expects the part to have an originalFilename property.
            if (part.originalFilename) {
                return part.originalFilename;
            }
            // Fallback for cases where originalFilename might be missing
            return name + ext; 
        },
        // Force the filename to be the original uploaded filename
        filter: function ({ name, originalFilename, mimetype }) {
            // keep only pdfs
            return mimetype === 'application/pdf';
        }
    });

    try {
        // The `req` object in App Router's route handlers is a standard Request object.
        // We can pass it to formidable's parse method.
        const [fields, files] = await form.parse(req as any);
        
        const uploadedFile = files.file?.[0];

        if (!uploadedFile) {
            return NextResponse.json({ error: 'No file uploaded or file was not a PDF.' }, { status: 400 });
        }
        
        // Formidable with the `filename` option should have already saved it with the correct name.
        // The file is now at uploadedFile.filepath
        
        return NextResponse.json({
            success: true,
            message: `File '${uploadedFile.originalFilename}' uploaded successfully.`,
            filePath: `/templates/${uploadedFile.originalFilename}`,
        });

    } catch (error: any) {
        console.error('File upload error:', error);
        
        let errorMessage = 'Failed to process file upload.';
        if (error instanceof formidableErrors.default) {
            if (error.code === 1009) { // formidable's code for max file size exceeded
                errorMessage = 'File size is too large.';
            }
        }

        return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
    }
}

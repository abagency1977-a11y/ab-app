
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { formidable, errors as formidableErrors } from 'formidable';

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

// This function will handle the file parsing using promises
const parseForm = (req: Request): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
    return new Promise((resolve, reject) => {
        const form = formidable({
            uploadDir: TEMPLATES_DIR,
            keepExtensions: true,
            filename: (name, ext, part) => {
                // This is a common source of errors if part.originalFilename is null.
                if (part.originalFilename) {
                    return part.originalFilename;
                }
                // Provide a fallback name if originalFilename is missing.
                return `template-${Date.now()}${ext}`;
            },
            filter: function ({ mimetype }) {
                // Keep only pdfs
                return mimetype === 'application/pdf';
            }
        });

        // The 'any' cast is a common workaround for formidable's type mismatch with Next.js's Request object
        form.parse(req as any, (err, fields, files) => {
            if (err) {
                reject(err);
            } else {
                resolve({ fields, files });
            }
        });
    });
};


export async function POST(req: Request) {
    await ensureTemplatesDirExists();

    try {
        const { files } = await parseForm(req);

        const uploadedFile = files.file?.[0];

        if (!uploadedFile) {
            return NextResponse.json({ error: 'No file uploaded or file was not a PDF.' }, { status: 400 });
        }

        // Formidable already saved the file to the correct location with the correct name due to the 'filename' option.
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
             // You can check for specific formidable errors here if needed
            errorMessage = error.message;
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

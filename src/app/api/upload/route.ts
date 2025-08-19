
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { formidable, errors as formidableErrors } from 'formidable';
import { Writable } from 'stream';

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
    return new Promise(async (resolve, reject) => {
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

        // This is a workaround for formidable's type mismatch with Next.js's Request object
        // It pipes the request body to a writable stream that formidable can process.
        const formidableStream = new Writable({
            write(chunk, encoding, callback) {
                form.write(chunk, callback);
            },
            final(callback) {
                form.end(callback);
            },
        });
        
        if (req.body) {
            // @ts-ignore
            await req.body.pipeTo(new WritableStream(formidableStream));
        }

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

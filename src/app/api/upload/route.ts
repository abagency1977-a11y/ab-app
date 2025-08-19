
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
                    // Sanitize the filename to prevent directory traversal issues
                    return part.originalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
                }
                // Provide a fallback name if originalFilename is missing.
                return `template-${Date.now()}${ext}`;
            },
            filter: function ({ mimetype }) {
                // Keep only pdfs
                return mimetype === 'application/pdf';
            }
        });

        // This is the key part to bridge web streams with Node.js streams
        const chunks: Uint8Array[] = [];
        const writable = new Writable({
            write(chunk, encoding, callback) {
                chunks.push(chunk);
                callback();
            },
            final(callback) {
                const buffer = Buffer.concat(chunks);
                form.parse(buffer as any, (err, fields, files) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ fields, files });
                    }
                });
                callback();
            }
        });

        if (req.body) {
            const reader = req.body.getReader();
            const read = async () => {
                const { done, value } = await reader.read();
                if (done) {
                    writable.end();
                    return;
                }
                writable.write(value);
                read();
            };
            read().catch(reject);
        } else {
            reject(new Error('Request body is null'));
        }
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
        
        // Ensure the file is saved with the correct name by renaming it if necessary
        const finalPath = path.join(TEMPLATES_DIR, uploadedFile.originalFilename as string);
        await fs.rename(uploadedFile.filepath, finalPath);

        return NextResponse.json({
            success: true,
            message: `File '${uploadedFile.originalFilename}' uploaded successfully.`,
            filePath: `/templates/${uploadedFile.originalFilename}`,
        });

    } catch (error: any) {
        console.error('File upload error:', error);
        
        let errorMessage = 'Failed to process file upload.';
        let statusCode = 500;

        if (error instanceof formidableErrors.default) {
             errorMessage = error.message;
             statusCode = error.httpCode || 400;
        } else if (error.code === 'ENOENT') {
            errorMessage = "File system error: Couldn't save the file.";
            statusCode = 500;
        }


        return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
}

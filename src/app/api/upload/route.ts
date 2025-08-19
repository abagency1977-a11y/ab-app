
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

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

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }

        if (file.type !== 'application/pdf') {
             return NextResponse.json({ error: 'Invalid file type. Only PDFs are allowed.' }, { status: 400 });
        }

        // It's crucial to use the filename from the form data, not one provided in the URL
        const filename = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const finalPath = path.join(TEMPLATES_DIR, filename);

        // Convert the file to a Buffer
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // Write the file to the filesystem
        await fs.writeFile(finalPath, fileBuffer);

        return NextResponse.json({
            success: true,
            message: `File '${filename}' uploaded successfully.`,
            filePath: `/templates/${filename}`,
        });

    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json({ error: 'Failed to process file upload.', details: error.message }, { status: 500 });
    }
}

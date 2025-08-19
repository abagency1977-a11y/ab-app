
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { formidable } from 'formidable';

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
        // The file name will be the original name of the uploaded file
        filename: (name, ext, part, form) => {
            return part.originalFilename!;
        },
    });

    try {
        const [fields, files] = await form.parse(req as any);
        const file = files.file?.[0];

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        // formidable already saved the file with its original name
        const finalPath = path.join(TEMPLATES_DIR, file.originalFilename!);

        // Optional: If formidable gives it a temp name, you'd rename it.
        // But with the filename option, this should not be necessary.
        // If file.newFilename is different, you might need to rename.
        // await fs.rename(file.filepath, finalPath);

        return NextResponse.json({
            success: true,
            message: `File '${file.originalFilename}' uploaded successfully.`,
            filePath: `/templates/${file.originalFilename}`,
        });

    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json({ error: 'Failed to process file upload.', details: error.message }, { status: 500 });
    }
}

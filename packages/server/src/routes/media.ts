import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import sql from '../db/connection';
import { join } from 'path';
import { unlink } from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
};

function validateMagicBytes(bytes: Uint8Array): string | null {
  for (const [mime, magic] of Object.entries(MAGIC_BYTES)) {
    if (magic.every((b, i) => bytes[i] === b)) return mime;
  }
  return null;
}

export async function handleMedia(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // POST /api/media/upload
  if (url.pathname === '/api/media/upload' && req.method === 'POST') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return Response.json({ success: false, error: 'No file provided' }, { status: 400, headers: corsHeaders() });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return Response.json({ success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400, headers: corsHeaders() });
    }

    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ success: false, error: 'File too large (max 2MB)' }, { status: 400, headers: corsHeaders() });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const detectedType = validateMagicBytes(buffer);
    if (!detectedType) {
      return Response.json({ success: false, error: 'Invalid file content' }, { status: 400, headers: corsHeaders() });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    await Bun.write(filepath, file);

    const rows = await sql`
      INSERT INTO media (filename, original_name, mime_type, size)
      VALUES (${filename}, ${file.name}, ${file.type}, ${file.size})
      RETURNING id, filename, original_name, mime_type, size, uploaded_at`;

    return Response.json(
      { success: true, data: rows[0], newToken: auth.newToken },
      { status: 201, headers: corsHeaders() }
    );
  }

  // GET /media/:filename
  const mediaMatch = url.pathname.match(/^\/media\/([a-zA-Z0-9\-_\.]+)$/);
  if (mediaMatch && req.method === 'GET') {
    const filename = mediaMatch[1];
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return Response.json({ success: false, error: 'Invalid filename' }, { status: 400 });
    }
    const filepath = join(UPLOAD_DIR, filename);
    const file = Bun.file(filepath);
    if (!(await file.exists())) {
      return Response.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    return new Response(file);
  }

  return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
}

export async function deleteLocalMedia(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith('/media/')) return;
  const filename = url.replace('/media/', '');
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return;
  const filepath = join(UPLOAD_DIR, filename);
  try {
    const file = Bun.file(filepath);
    if (await file.exists()) {
      await unlink(filepath);
    }
  } catch (err) {
    console.error(`Failed to delete file ${filepath}:`, err);
  }
  try {
    await sql`DELETE FROM media WHERE filename = ${filename}`;
  } catch (err) {
    console.error(`Failed to delete media record for ${filename}:`, err);
  }
}


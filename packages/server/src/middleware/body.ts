import { corsHeaders } from './cors';

export class RequestBodyError extends Error {
  constructor(message: string, public readonly status: 400 | 413 | 415) {
    super(message);
  }
}

async function readBytes(req: Request, maxBytes: number): Promise<Uint8Array> {
  const lengthHeader = req.headers.get('content-length');
  if (lengthHeader) {
    const declared = Number(lengthHeader);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      throw new RequestBodyError('Invalid Content-Length', 400);
    }
    if (declared > maxBytes) {
      throw new RequestBodyError('Request body too large', 413);
    }
  }

  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new RequestBodyError('Request body too large', 413);
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function readJson<T = any>(req: Request, maxBytes = 64 * 1024): Promise<T> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new RequestBodyError('Content-Type must be application/json', 415);
  }
  const bytes = await readBytes(req, maxBytes);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as T;
  } catch {
    throw new RequestBodyError('Invalid JSON body', 400);
  }
}

export async function readFormData(req: Request, maxBytes: number): Promise<FormData> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw new RequestBodyError('Content-Type must be multipart/form-data', 415);
  }
  const bytes = await readBytes(req, maxBytes);
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  try {
    return await new Request(req.url, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body,
    }).formData();
  } catch {
    throw new RequestBodyError('Invalid multipart body', 400);
  }
}

export function bodyErrorResponse(error: RequestBodyError): Response {
  return Response.json(
    { success: false, error: error.message },
    { status: error.status, headers: corsHeaders() }
  );
}

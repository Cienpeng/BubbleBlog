import { corsHeaders } from './cors';

const BUSINESS_METHODS = new Set(['GET', 'POST']);

/**
 * Business endpoints only expose GET and POST. OPTIONS is handled separately
 * by the CORS middleware as a protocol-level preflight request.
 */
export function rejectUnsupportedMethod(req: Request): Response | null {
  if (BUSINESS_METHODS.has(req.method)) return null;

  return Response.json(
    { success: false, error: 'Method not allowed. Use GET or POST.' },
    {
      status: 405,
      headers: {
        ...corsHeaders(),
        Allow: 'GET, POST',
      },
    }
  );
}

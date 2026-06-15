import type { ApiResponse } from '@bubbleblog/shared';

const PORT = parseInt(process.env.PORT || '3000');

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/api/health') {
      const response: ApiResponse<{ status: string }> = { success: true, data: { status: 'ok' } };
      return Response.json(response);
    }
    return Response.json({ success: false, error: 'Not found' } as ApiResponse<never>, { status: 404 });
  },
});

console.log(`Server running on http://localhost:${PORT}`);

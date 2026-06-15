const PORT = parseInt(process.env.PORT || '3000');

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/api/health') {
      return Response.json({ success: true, data: { status: 'ok' } });
    }
    return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  },
});

console.log(`Server running on http://localhost:${PORT}`);

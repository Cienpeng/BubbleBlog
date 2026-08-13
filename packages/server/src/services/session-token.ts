export function getSessionToken(req: Request): string | null {
  const cookie = req.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === 'bubbleblog_session') {
      try {
        return decodeURIComponent(valueParts.join('=')) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

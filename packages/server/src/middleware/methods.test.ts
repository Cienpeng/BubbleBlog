import { describe, expect, test } from 'bun:test';
import { rejectUnsupportedMethod } from './methods';

describe('business HTTP method allowlist', () => {
  test.each(['GET', 'POST'])('allows %s', method => {
    const request = new Request('http://localhost/api/health', { method });
    expect(rejectUnsupportedMethod(request)).toBeNull();
  });

  test.each(['PUT', 'DELETE', 'PATCH', 'HEAD'])('rejects %s with 405', method => {
    const request = new Request('http://localhost/api/health', { method });
    const response = rejectUnsupportedMethod(request);

    expect(response?.status).toBe(405);
    expect(response?.headers.get('Allow')).toBe('GET, POST');
  });
});

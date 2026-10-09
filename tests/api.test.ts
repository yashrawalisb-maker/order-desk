import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../api/draft';

const post = (body: unknown, ip = '1.1.1.1') =>
  POST(new Request('http://x/api/draft', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) }));

afterEach(() => vi.unstubAllEnvs());

describe('api/draft guards', () => {
  it('reports off and refuses to draft with no key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect(await GET().json()).toEqual({ on: false });
    const res = await post({ retailerId: 'sharma', text: 'parle 10' });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'off' });
  });

  it('validates input before calling the model', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');
    expect(await GET().json()).toEqual({ on: true });
    expect(await (await post({ retailerId: 'patel', text: 'x' }, '2.2.2.2')).json()).toEqual({ error: 'bad_request' });
    expect(await (await post({ retailerId: 'sharma', text: 'x'.repeat(1001) }, '2.2.2.3')).json()).toEqual({ error: 'too_long' });
    expect(await (await post({ retailerId: 'sharma', text: '  ' }, '2.2.2.4')).json()).toEqual({ error: 'empty_lines' });
    expect(await (await post({ retailerId: 'sharma', text: '', imageBase64: 'abc', imageMediaType: 'image/tiff' }, '2.2.2.5')).json()).toEqual({ error: 'image_rejected' });
  });

  it('rate-limits to 10 calls a minute per IP', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');
    for (let i = 0; i < 10; i++) await post({ retailerId: 'nope' }, '9.9.9.9');
    const res = await post({ retailerId: 'nope' }, '9.9.9.9');
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited' });
  });
});

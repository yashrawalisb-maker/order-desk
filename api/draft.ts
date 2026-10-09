import Anthropic from '@anthropic-ai/sdk';
import { MAX_TEXT, RETAILERS, LIVE_RETAILERS } from '../src/data/seed.js';
import { buildPrompt, parseModelJson } from '../src/lib/prompt.js';

// POST /api/draft  {retailerId, text, imageBase64?, imageMediaType?}
//   -> 200 {lines, order_flag} (raw model JSON; the browser runs fromAI on it)
//   -> 4xx/5xx {error: code}
// GET /api/draft -> {on: boolean}, so the Live tab knows whether to enable itself.

const MODEL = 'claude-haiku-5-5';
const TIMEOUT_MS = 25_000;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

// In-memory per-IP limiter: 10 calls a minute. Resets on cold start, which is fine for a demo.
const WINDOW_MS = 60_000;
const LIMIT = 10;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export function GET(): Response {
  return json({ on: !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'off' }, 503);

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json({ error: 'rate_limited' }, 429);

  let body: { retailerId?: unknown; text?: unknown; imageBase64?: unknown; imageMediaType?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const retailerId = String(body.retailerId || '');
  if (!(LIVE_RETAILERS as readonly string[]).includes(retailerId)) return json({ error: 'bad_request' }, 400);
  const r = RETAILERS[retailerId];
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length > MAX_TEXT) return json({ error: 'too_long' }, 400);

  let image: { data: string; type: ImageType } | null = null;
  if (typeof body.imageBase64 === 'string' && body.imageBase64) {
    const type = String(body.imageMediaType) as ImageType;
    const bytes = Math.floor((body.imageBase64.length * 3) / 4);
    if (!IMAGE_TYPES.includes(type) || bytes > MAX_IMAGE_BYTES) return json({ error: 'image_rejected' }, 400);
    image = { data: body.imageBase64, type };
  }
  if (!text && !image) return json({ error: 'empty_lines' }, 400);

  const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
  const prompt = buildPrompt(r, text, !!image);

  let reply = '';
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      messages: [
        {
          role: 'user',
          content: image
            ? [
                { type: 'image', source: { type: 'base64', media_type: image.type, data: image.data } },
                { type: 'text', text: prompt },
              ]
            : prompt,
        },
      ],
    });
    if (msg.stop_reason === 'refusal') return json({ error: 'refused' }, 422);
    for (const block of msg.content) if (block.type === 'text') reply += block.text;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    if (e instanceof Anthropic.BadRequestError && image && /image/i.test(e.message)) return json({ error: 'image_rejected' }, 400);
    console.error('draft: upstream error', e instanceof Error ? e.message : e);
    return json({ error: 'upstream' }, 502);
  }

  try {
    const parsed = parseModelJson(reply);
    if (!parsed.lines.length) return json({ error: 'empty_lines' }, 422);
    return json(parsed);
  } catch {
    return json({ error: 'invalid_json' }, 422);
  }
}

// Browser side of POST /api/draft. The API key never reaches the browser.

export type LiveState = 'checking' | 'on' | 'off';

export class DraftError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export async function liveStatus(): Promise<LiveState> {
  try {
    const res = await fetch('/api/draft', { method: 'GET' });
    if (!res.ok) return 'off';
    const v = await res.json();
    return v && v.on ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

export async function requestDraft(
  body: { retailerId: string; text: string; imageBase64?: string; imageMediaType?: string },
  signal: AbortSignal,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch('/api/draft', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (signal.aborted) throw new DraftError('cancelled');
    throw new DraftError('network');
  }
  let v: unknown = null;
  try {
    v = await res.json();
  } catch {
    throw new DraftError(res.ok ? 'invalid_json' : 'network');
  }
  if (!res.ok || (v && typeof v === 'object' && 'error' in v)) {
    throw new DraftError(String((v as { error?: string })?.error || 'network'));
  }
  return v;
}

/** Downscale a photo with a canvas so the upload stays under 1.5 MB. */
export async function downscale(file: File): Promise<{ data: string; type: string }> {
  const MAX_BYTES = 1.5 * 1024 * 1024;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new DraftError('image_rejected');
  }
  for (const side of [1600, 1200, 900]) {
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', 0.82);
    const data = url.slice(url.indexOf(',') + 1);
    if ((data.length * 3) / 4 <= MAX_BYTES) return { data, type: 'image/jpeg' };
  }
  throw new DraftError('image_rejected');
}

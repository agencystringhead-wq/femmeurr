import { env } from 'cloudflare:workers';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type ImageCheck =
  | { ok: true; ext: 'webp' | 'jpg' | 'png'; type: string; data: ArrayBuffer }
  | { ok: false; error: 'photo_missing' | 'photo_big' | 'photo_type' };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, i) => bytes[offset + i] === value);

// Looks at the real file bytes, not just the name or declared type.
export async function checkImage(value: FormDataEntryValue | null): Promise<ImageCheck> {
  if (!(value instanceof File) || value.size === 0) return { ok: false, error: 'photo_missing' };
  if (value.size > MAX_IMAGE_BYTES) return { ok: false, error: 'photo_big' };

  const data = await value.arrayBuffer();
  if (data.byteLength > MAX_IMAGE_BYTES) return { ok: false, error: 'photo_big' };

  const bytes = new Uint8Array(data.slice(0, 16));
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { ok: true, ext: 'webp', type: 'image/webp', data };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ok: true, ext: 'jpg', type: 'image/jpeg', data };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return { ok: true, ext: 'png', type: 'image/png', data };
  return { ok: false, error: 'photo_type' };
}

const randomId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
};

// Keys are never reused: every upload gets a new random key, so cached images never go stale.
export async function saveImage(code: string, image: Extract<ImageCheck, { ok: true }>): Promise<string> {
  const safeCode = code.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const key = `products/${safeCode || 'item'}-${randomId()}.${image.ext}`;
  await env.IMAGES.put(key, image.data, { httpMetadata: { contentType: image.type } });
  return key;
}

export async function deleteImage(key: string | null | undefined) {
  if (!key) return;
  try {
    await env.IMAGES.delete(key);
  } catch (error) {
    console.error('Image delete failed', key, error);
  }
}

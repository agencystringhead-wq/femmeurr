import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Serves images from the private R2 bucket. Keys are immutable (a new upload gets a new key),
// so responses can be cached for a year.
export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key ?? '';
  if (!/^[A-Za-z0-9._\/-]+$/.test(key) || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const etag = object.httpEtag;
  const headers = new Headers({
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    ETag: etag,
  });

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
};

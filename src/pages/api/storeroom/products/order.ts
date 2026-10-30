import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

const MAX_ITEMS = 2000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Saves the whole order in one request. The list position becomes sort_order (1, 2, 3...).
// All updates run in a single D1 batch, which is one transaction: a half-saved order cannot happen.
export const POST: APIRoute = async ({ request }) => {
  let ids: unknown;
  try {
    ids = (await request.json()).ids;
  } catch {
    return json({ error: 'Could not read the new order. Please try again.' }, 400);
  }

  const valid =
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.length <= MAX_ITEMS &&
    ids.every((id) => Number.isInteger(id) && id > 0) &&
    new Set(ids).size === ids.length;
  if (!valid) return json({ error: 'The new order was not valid. Please reload the page and try again.' }, 400);

  try {
    const update = env.DB.prepare('UPDATE products SET sort_order = ?1 WHERE id = ?2');
    // Products added while the page was open (not in this list) keep their sort_order of 0 or less, so they stay on top.
    await env.DB.batch((ids as number[]).map((id, index) => update.bind(index + 1, id)));
    return json({ ok: true, count: (ids as number[]).length });
  } catch (error) {
    console.error('Saving order failed', error);
    return json({ error: 'Could not save the order. Please try again.' }, 500);
  }
};

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { parseId } from '../../../../../lib/storeroom';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Adds `delta` (+1 / -1) to the quantity in one atomic statement; never goes below 0.
export const POST: APIRoute = async ({ params, request }) => {
  const id = parseId(params.id);
  const wantsJson = request.headers.get('accept')?.includes('application/json');
  const redirect = () => new Response(null, { status: 303, headers: { Location: '/storeroom' } });
  if (id === null) return wantsJson ? json({ error: 'Item not found.' }, 404) : redirect();

  let delta = 0;
  const type = request.headers.get('content-type') ?? '';
  try {
    const raw = type.includes('json') ? (await request.json()).delta : (await request.formData()).get('delta');
    delta = Number(raw);
  } catch {
    delta = NaN;
  }
  if (delta !== 1 && delta !== -1) return wantsJson ? json({ error: 'Please use the + or - button.' }, 400) : redirect();

  try {
    const row = await env.DB.prepare(
      "UPDATE products SET quantity = MAX(0, quantity + ?1), updated_at = datetime('now') WHERE id = ?2 RETURNING quantity",
    )
      .bind(delta, id)
      .first<{ quantity: number }>();
    if (!row) return wantsJson ? json({ error: 'Item not found.' }, 404) : redirect();
    return wantsJson ? json({ quantity: row.quantity }) : redirect();
  } catch (error) {
    console.error('Quantity update failed', error);
    return wantsJson ? json({ error: 'Could not save. Please try again.' }, 500) : redirect();
  }
};

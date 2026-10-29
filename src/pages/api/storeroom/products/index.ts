import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkImage, deleteImage, saveImage } from '../../../../lib/images';
import { ERROR_MESSAGES, parseProductForm, predictNextCode } from '../../../../lib/storeroom';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Creates a product. The photo, details and the new row are handled together, so a failure never leaves a half-made item.
export const POST: APIRoute = async ({ request }) => {
  const wantsJson = request.headers.get('accept')?.includes('application/json');
  const fail = (code: keyof typeof ERROR_MESSAGES, status = 400) =>
    wantsJson
      ? json({ error: ERROR_MESSAGES[code] }, status)
      : new Response(null, { status: 303, headers: { Location: `/storeroom/new?error=${code}` } });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('failed');
  }

  const parsed = parseProductForm(form);
  if (!parsed.ok) return fail(parsed.error!);

  const image = await checkImage(form.get('photo'));
  if (!image.ok) return fail(image.error);

  let key: string | null = null;
  try {
    key = await saveImage(await predictNextCode(), image);
    // New items go to the top: sort_order one lower than everything else. Code is assigned in the same statement.
    const row = await env.DB.prepare(
      `INSERT INTO products (code, name, price_inr, quantity, image_key, visible, sort_order)
       VALUES (
         'FM-' || printf('%03d', (SELECT COALESCE(MAX(CAST(SUBSTR(code, 4) AS INTEGER)), 0) + 1 FROM products WHERE code LIKE 'FM-%')),
         ?1, ?2, ?3, ?4, ?5,
         (SELECT COALESCE(MIN(sort_order), 1) - 1 FROM products)
       ) RETURNING id, code`,
    )
      .bind(parsed.name, parsed.price_inr, parsed.quantity, key, parsed.visible)
      .first<{ id: number; code: string }>();
    if (!row) throw new Error('Insert returned no row');

    const redirect = `/storeroom?added=${encodeURIComponent(row.code)}`;
    return wantsJson ? json({ redirect, code: row.code }) : new Response(null, { status: 303, headers: { Location: redirect } });
  } catch (error) {
    console.error('Product create failed', error);
    await deleteImage(key);
    return fail('failed', 500);
  }
};

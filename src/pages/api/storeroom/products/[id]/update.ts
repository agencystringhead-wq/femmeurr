import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkImage, deleteImage, saveImage } from '../../../../../lib/images';
import { ERROR_MESSAGES, getProduct, parseId, parseProductForm } from '../../../../../lib/storeroom';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ params, request }) => {
  const id = parseId(params.id);
  const wantsJson = request.headers.get('accept')?.includes('application/json');
  const go = (path: string) => new Response(null, { status: 303, headers: { Location: path } });
  const fail = (code: keyof typeof ERROR_MESSAGES, status = 400) =>
    wantsJson ? json({ error: ERROR_MESSAGES[code] }, status) : go(`/storeroom/${id}?error=${code}`);

  if (id === null) return wantsJson ? json({ error: 'Item not found.' }, 404) : go('/storeroom');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('failed');
  }

  const parsed = parseProductForm(form);
  if (!parsed.ok) return fail(parsed.error!);

  const product = await getProduct(id);
  if (!product) return wantsJson ? json({ error: 'Item not found.' }, 404) : go('/storeroom');

  // A photo is optional when editing. If one is sent, it must be valid.
  const photo = form.get('photo');
  const hasPhoto = photo instanceof File && photo.size > 0;
  let newKey: string | null = null;

  try {
    if (hasPhoto) {
      const image = await checkImage(photo);
      if (!image.ok) return fail(image.error);
      newKey = await saveImage(product.code, image);
    }

    const result = await env.DB.prepare(
      `UPDATE products SET category = ?1, price_inr = ?2, quantity = ?3, visible = ?4,
         image_key = COALESCE(?5, image_key), updated_at = datetime('now') WHERE id = ?6`,
    )
      .bind(parsed.category, parsed.price_inr, parsed.quantity, parsed.visible, newKey, id)
      .run();
    if (!result.meta.changes) {
      await deleteImage(newKey);
      return wantsJson ? json({ error: 'Item not found.' }, 404) : go('/storeroom');
    }

    // Only after the new photo is safely saved do we remove the old one.
    if (newKey && product.image_key && product.image_key !== newKey) await deleteImage(product.image_key);

    return wantsJson ? json({ redirect: '/storeroom?saved=1' }) : go('/storeroom?saved=1');
  } catch (error) {
    console.error('Product update failed', error);
    await deleteImage(newKey);
    return fail('failed', 500);
  }
};

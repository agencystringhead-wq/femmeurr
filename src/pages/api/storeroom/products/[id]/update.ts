import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { parseId, parseProductForm } from '../../../../../lib/storeroom';

export const prerender = false;

const go = (path: string) => new Response(null, { status: 303, headers: { Location: path } });

export const POST: APIRoute = async ({ params, request }) => {
  const id = parseId(params.id);
  if (id === null) return go('/storeroom');

  const parsed = parseProductForm(await request.formData());
  if (!parsed.ok) return go(`/storeroom/${id}?error=${parsed.error}`);

  try {
    const result = await env.DB.prepare(
      `UPDATE products SET name = ?1, price_inr = ?2, quantity = ?3, visible = ?4, updated_at = datetime('now') WHERE id = ?5`,
    )
      .bind(parsed.name, parsed.price_inr, parsed.quantity, parsed.visible, id)
      .run();
    if (!result.meta.changes) return go('/storeroom');
    return go('/storeroom?saved=1');
  } catch (error) {
    console.error('Product update failed', error);
    return go(`/storeroom/${id}?error=failed`);
  }
};

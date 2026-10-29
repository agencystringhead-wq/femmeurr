import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getProduct, parseId } from '../../../../../lib/storeroom';

export const prerender = false;

const go = (path: string) => new Response(null, { status: 303, headers: { Location: path } });

// Removes the row first, then its image. A leftover image is harmless; a row pointing at a missing image is not.
export const POST: APIRoute = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) return go('/storeroom');

  try {
    const product = await getProduct(id);
    if (!product) return go('/storeroom');

    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    if (product.image_key) {
      try {
        await env.IMAGES.delete(product.image_key);
      } catch (error) {
        console.error('Image delete failed', product.image_key, error);
      }
    }
    return go('/storeroom?deleted=1');
  } catch (error) {
    console.error('Product delete failed', error);
    return go(`/storeroom/${id}?error=failed`);
  }
};

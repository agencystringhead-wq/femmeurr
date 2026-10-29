import { env } from 'cloudflare:workers';

export interface Product {
  id: number;
  code: string;
  price_inr: number;
  quantity: number;
  image_url: string | null;
  visible: boolean;
  sort_order: number;
}

interface ProductRow {
  id: number;
  code: string;
  price_inr: number;
  quantity: number;
  image_key: string | null;
  visible: number;
  sort_order: number;
}

export const imageUrl = (key: string | null) => (key ? `/img/${key}` : null);

// Only visible, in-stock products (sold-out items never reach the public page), by sort_order then newest.
export async function getVisibleProducts(): Promise<Product[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, code, price_inr, quantity, image_key, visible, sort_order
     FROM products
     WHERE visible = 1 AND quantity >= 1
     ORDER BY sort_order, created_at DESC, id DESC`,
  ).all<ProductRow>();

  return results.map((row) => ({
    id: row.id,
    code: row.code,
    price_inr: row.price_inr,
    quantity: row.quantity,
    image_url: imageUrl(row.image_key),
    visible: row.visible === 1,
    sort_order: row.sort_order,
  }));
}

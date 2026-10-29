import { env } from 'cloudflare:workers';

export interface Product {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  quantity: number;
  image_url: string | null;
  visible: boolean;
  sort_order: number;
}

interface ProductRow {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  quantity: number;
  image_key: string | null;
  visible: number;
  sort_order: number;
}

export const imageUrl = (key: string | null) => (key ? `/img/${key}` : null);

// Visible products only: in stock first, sold out last, then sort_order, then newest.
export async function getVisibleProducts(): Promise<Product[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, code, name, price_inr, quantity, image_key, visible, sort_order
     FROM products
     WHERE visible = 1
     ORDER BY (quantity <= 0), sort_order, created_at DESC, id DESC`,
  ).all<ProductRow>();

  return results.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    price_inr: row.price_inr,
    quantity: row.quantity,
    image_url: imageUrl(row.image_key),
    visible: row.visible === 1,
    sort_order: row.sort_order,
  }));
}

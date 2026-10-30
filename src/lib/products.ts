import { env } from 'cloudflare:workers';
import { categoryByKey, fullCode } from '../categories';

export interface Product {
  id: number;
  code: string; // full code shown to customers, e.g. FM-004N (plain FM-004 until a category is set)
  category_slug: string; // '' when uncategorised
  price_inr: number;
  quantity: number;
  image_url: string | null;
  visible: boolean;
  sort_order: number;
}

interface ProductRow {
  id: number;
  code: string;
  category: string | null;
  price_inr: number;
  quantity: number;
  image_key: string | null;
  visible: number;
  sort_order: number;
}

export const imageUrl = (key: string | null) => (key ? `/img/${key}` : null);

// Only visible, in-stock products (sold-out items never reach the public page), in the order set in the storeroom.
export async function getVisibleProducts(): Promise<Product[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, code, category, price_inr, quantity, image_key, visible, sort_order
     FROM products
     WHERE visible = 1 AND quantity >= 1
     ORDER BY sort_order ASC, id DESC`, // sort_order is unique; id only makes any tie deterministic
  ).all<ProductRow>();

  return results.map((row) => ({
    id: row.id,
    code: fullCode(row.code, row.category),
    category_slug: categoryByKey(row.category)?.slug ?? '',
    price_inr: row.price_inr,
    quantity: row.quantity,
    image_url: imageUrl(row.image_key),
    visible: row.visible === 1,
    sort_order: row.sort_order,
  }));
}

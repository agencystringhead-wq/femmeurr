import { env } from 'cloudflare:workers';

export interface StoreroomProduct {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  quantity: number;
  image_key: string | null;
  visible: number;
}

export const listAllProducts = async () => {
  const { results } = await env.DB.prepare(
    'SELECT id, code, name, price_inr, quantity, image_key, visible FROM products ORDER BY sort_order, id',
  ).all<StoreroomProduct>();
  return results;
};

export const getProduct = (id: number) =>
  env.DB.prepare('SELECT id, code, name, price_inr, quantity, image_key, visible FROM products WHERE id = ?')
    .bind(id)
    .first<StoreroomProduct>();

export const parseId = (value: string | undefined) => (value && /^\d+$/.test(value) ? Number(value) : null);

// Friendly messages for the edit form. Keys are used in the ?error= query so no raw text is reflected.
export const ERROR_MESSAGES: Record<string, string> = {
  name: 'Please enter a name for this item.',
  price: 'Price must be a whole number in rupees, like 2500.',
  quantity: 'Quantity must be a whole number, 0 or more.',
  failed: 'Something went wrong while saving. Please try again.',
};

export interface ParsedProductForm {
  ok: boolean;
  error?: keyof typeof ERROR_MESSAGES;
  name: string;
  price_inr: number;
  quantity: number;
  visible: number;
}

const wholeNumber = (raw: string) => {
  const cleaned = raw.replace(/[₹,\s]/g, '');
  return /^\d{1,9}$/.test(cleaned) ? Number(cleaned) : null;
};

export function parseProductForm(form: FormData): ParsedProductForm {
  const name = String(form.get('name') ?? '').trim().replace(/\s+/g, ' ');
  const price = wholeNumber(String(form.get('price_inr') ?? ''));
  const quantity = wholeNumber(String(form.get('quantity') ?? ''));
  const visible = form.get('visible') ? 1 : 0;
  const base = { name, price_inr: price ?? 0, quantity: quantity ?? 0, visible };

  if (!name || name.length > 120) return { ok: false, error: 'name', ...base };
  if (price === null) return { ok: false, error: 'price', ...base };
  if (quantity === null || quantity > 100000) return { ok: false, error: 'quantity', ...base };
  return { ok: true, ...base };
}

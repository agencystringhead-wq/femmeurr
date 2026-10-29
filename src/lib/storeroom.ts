import { env } from 'cloudflare:workers';

export interface StoreroomProduct {
  id: number;
  code: string;
  price_inr: number;
  quantity: number;
  image_key: string | null;
  visible: number;
}

export const listAllProducts = async () => {
  const { results } = await env.DB.prepare(
    'SELECT id, code, price_inr, quantity, image_key, visible FROM products ORDER BY sort_order, id',
  ).all<StoreroomProduct>();
  return results;
};

export const getProduct = (id: number) =>
  env.DB.prepare('SELECT id, code, price_inr, quantity, image_key, visible FROM products WHERE id = ?')
    .bind(id)
    .first<StoreroomProduct>();

export const parseId = (value: string | undefined) => (value && /^\d+$/.test(value) ? Number(value) : null);

// Friendly messages for the edit form. Keys are used in the ?error= query so no raw text is reflected.
export const ERROR_MESSAGES: Record<string, string> = {
  price: 'Price must be a whole number in rupees, like 2500.',
  quantity: 'Quantity must be a whole number, 0 or more.',
  failed: 'Something went wrong while saving. Please try again.',
  photo_missing: 'Please add a photo of the item.',
  photo_big: 'That photo is too big. Please choose another one or take a new photo.',
  photo_type: 'That file is not a photo we can use. Please choose a normal photo (JPEG, PNG or WebP).',
};

export interface ParsedProductForm {
  ok: boolean;
  error?: keyof typeof ERROR_MESSAGES;
  price_inr: number;
  quantity: number;
  visible: number;
}

const wholeNumber = (raw: string) => {
  const cleaned = raw.replace(/[₹,\s]/g, '');
  return /^\d{1,9}$/.test(cleaned) ? Number(cleaned) : null;
};

export function parseProductForm(form: FormData): ParsedProductForm {
  const price = wholeNumber(String(form.get('price_inr') ?? ''));
  const quantity = wholeNumber(String(form.get('quantity') ?? ''));
  const visible = form.get('visible') ? 1 : 0;
  const base = { price_inr: price ?? 0, quantity: quantity ?? 0, visible };

  if (price === null) return { ok: false, error: 'price', ...base };
  if (quantity === null || quantity > 100000) return { ok: false, error: 'quantity', ...base };
  return { ok: true, ...base };
}

// Next FM-### number, only used to name the image file. The real code is assigned atomically when the row is inserted.
export async function predictNextCode(): Promise<string> {
  const row = await env.DB.prepare(
    "SELECT COALESCE(MAX(CAST(SUBSTR(code, 4) AS INTEGER)), 0) + 1 AS n FROM products WHERE code LIKE 'FM-%'",
  ).first<{ n: number }>();
  return `FM-${String(row?.n ?? 1).padStart(3, '0')}`;
}

import { env } from 'cloudflare:workers';
import { categoryByKey, categoryList, fullCode, isCategoryKey } from '../categories';

export interface StoreroomProduct {
  id: number;
  code: string; // plain running number, e.g. FM-004 (never changes)
  category: string | null;
  display_code: string; // full code, e.g. FM-004N
  price_inr: number;
  quantity: number;
  image_key: string | null;
  visible: number;
}

type Row = Omit<StoreroomProduct, 'display_code'>;
const withDisplayCode = (row: Row): StoreroomProduct => ({ ...row, display_code: fullCode(row.code, row.category) });

export const listAllProducts = async () => {
  const { results } = await env.DB.prepare(
    'SELECT id, code, category, price_inr, quantity, image_key, visible FROM products ORDER BY sort_order ASC, id DESC',
  ).all<Row>();
  return results.map(withDisplayCode);
};

export const getProduct = async (id: number) => {
  const row = await env.DB.prepare('SELECT id, code, category, price_inr, quantity, image_key, visible FROM products WHERE id = ?')
    .bind(id)
    .first<Row>();
  return row ? withDisplayCode(row) : null;
};

export const parseId = (value: string | undefined) => (value && /^\d+$/.test(value) ? Number(value) : null);

// Friendly messages for the edit form. Keys are used in the ?error= query so no raw text is reflected.
export const ERROR_MESSAGES: Record<string, string> = {
  category: `Please choose a category: ${categoryList()}.`,
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
  category: string;
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
  const rawCategory = String(form.get('category') ?? '');
  const category = isCategoryKey(rawCategory) ? rawCategory : '';
  const base = { category, price_inr: price ?? 0, quantity: quantity ?? 0, visible };

  if (!category) return { ok: false, error: 'category', ...base };
  if (price === null) return { ok: false, error: 'price', ...base };
  if (quantity === null || quantity > 100000) return { ok: false, error: 'quantity', ...base };
  return { ok: true, ...base };
}

// The next running number, used for the preview and to name the image file. It is only a peek: the real number is
// taken from the counter in the same transaction that inserts the product, so it is never used twice.
export async function predictNextCode(): Promise<string> {
  const row = await env.DB.prepare("SELECT value + 1 AS n FROM counters WHERE name = 'product_code'").first<{ n: number }>();
  return `FM-${String(row?.n ?? 1).padStart(3, '0')}`;
}

export { categoryByKey, fullCode };

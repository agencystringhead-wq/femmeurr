// The one place categories are defined. To add one (e.g. Rings, letter R), add a line here and nothing else:
// the storeroom buttons, code letters, homepage filters and ?c= links all read this list.
// `key` is what is stored in the database, `letter` is appended to the code (FM-004 + N = FM-004N),
// and the homepage filter link uses the lowercase plural label (?c=earrings).
// Keep every letter unique.
const DEFINITIONS = [
  { key: 'necklace', label: 'Necklace', plural: 'Necklaces', letter: 'N' },
  { key: 'earrings', label: 'Earrings', plural: 'Earrings', letter: 'E' },
  { key: 'bracelet', label: 'Bracelet', plural: 'Bracelets', letter: 'B' },
] as const;

export interface Category {
  key: string;
  label: string;
  plural: string;
  letter: string;
  slug: string;
}

export const CATEGORIES: Category[] = DEFINITIONS.map((c) => ({ ...c, slug: c.plural.toLowerCase() }));

export const categoryByKey = (key: string | null | undefined) => CATEGORIES.find((c) => c.key === key) ?? null;

// Accepts the URL value (?c=earrings) and also the stored key, so old or hand-typed links still work.
export const categoryBySlug = (value: string | null | undefined) => {
  const v = (value ?? '').trim().toLowerCase();
  return CATEGORIES.find((c) => c.slug === v || c.key === v) ?? null;
};

export const isCategoryKey = (value: unknown): value is string => typeof value === 'string' && !!categoryByKey(value);

// FM-004 + necklace -> FM-004N. Products without a category show the plain code.
export const fullCode = (code: string, categoryKey: string | null | undefined) =>
  `${code}${categoryByKey(categoryKey)?.letter ?? ''}`;

export const categoryList = () => CATEGORIES.map((c) => c.label).join(', ');

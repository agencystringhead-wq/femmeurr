-- Product categories. `category` holds a key from src/categories.ts (nullable: existing products have none yet).
-- No CHECK constraint on purpose, so a new category (e.g. Rings) can be added in the config alone.
ALTER TABLE products ADD COLUMN category TEXT;

-- The running number (FM-004) is separate from the category letter (N/E/B) and is never handed out twice,
-- even if the newest product is deleted. This counter holds the last number used.
CREATE TABLE counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT INTO counters (name, value)
SELECT 'product_code', COALESCE(MAX(CAST(SUBSTR(code, 4) AS INTEGER)), 0)
FROM products
WHERE code LIKE 'FM-%';

-- Product names are no longer used; the code (FM-###) is the identifier.
-- `name` was NOT NULL with no default. SQLite cannot alter a default in place, so rebuild the table.
-- The column is kept (not dropped) and now defaults to an empty string.
CREATE TABLE products_new (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  price_inr INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  image_key TEXT,
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO products_new (id, code, name, price_inr, quantity, image_key, visible, sort_order, created_at, updated_at)
SELECT id, code, name, price_inr, quantity, image_key, visible, sort_order, created_at, updated_at FROM products;

DROP TABLE products;
ALTER TABLE products_new RENAME TO products;
CREATE INDEX idx_products_listing ON products (visible, sort_order);

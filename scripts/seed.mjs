// Seeds D1 + R2 with the 8 starter products. Safe to re-run: does nothing if the products table has rows.
// Usage: node scripts/seed.mjs --local   |   node scripts/seed.mjs --remote
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const target = process.argv[2];
if (target !== '--local' && target !== '--remote') {
  console.error('Usage: node scripts/seed.mjs --local | --remote');
  process.exit(1);
}

const DB = 'femmeurr-db';
const BUCKET = 'femmeurr-images';
const wrangler = (args) =>
  execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'inherit'] });

// Placeholder photos (picsum, fixed seeds). Replace via the storeroom later.
const PRODUCTS = [
  ['FM-001', 'Pearl Drop Earrings', 1850, 6, 'femmeurr-pearl'],
  ['FM-002', 'Gold Plated Hoop Earrings', 2400, 4, 'femmeurr-hoop'],
  ['FM-003', 'Solitaire Zircon Ring', 3200, 2, 'femmeurr-ring'],
  ['FM-004', 'Twisted Band Ring', 1500, 0, 'femmeurr-band'],
  ['FM-005', 'Layered Chain Necklace', 4750, 5, 'femmeurr-chain'],
  ['FM-006', 'Kundan Choker Necklace', 12500, 1, 'femmeurr-kundan'],
  ['FM-007', 'Antique Finish Bangles (Set of 2)', 6800, 3, 'femmeurr-bangle'],
  ['FM-008', 'Slim Cuff Bangle', 3900, 0, 'femmeurr-cuff'],
];

const dir = mkdtempSync(join(tmpdir(), 'femmeurr-seed-'));
const countFile = join(dir, 'count.sql');
writeFileSync(countFile, 'SELECT COUNT(*) AS n FROM products;');
const countJson = wrangler(['d1', 'execute', DB, target, '--json', '--file', countFile]);
const count = JSON.parse(countJson)[0].results[0].n;
if (count > 0) {
  console.log(`products table already has ${count} row(s) (${target}). Skipping seed.`);
  process.exit(0);
}

const statements = [];
for (const [i, [code, name, price, qty, seed]] of PRODUCTS.entries()) {
  const res = await fetch(`https://picsum.photos/seed/${seed}/800/800.jpg`);
  if (!res.ok) throw new Error(`Image download failed for ${code}: ${res.status}`);
  const file = join(dir, `${code}.jpg`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  const key = `products/${code.toLowerCase()}-${Date.now().toString(36)}${i}.jpg`;
  wrangler(['r2', 'object', 'put', `${BUCKET}/${key}`, target, '--file', file, '--content-type', 'image/jpeg']);
  console.log(`uploaded ${key}`);
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
  statements.push(
    `INSERT INTO products (code, name, price_inr, quantity, image_key, visible, sort_order) VALUES (${q(code)}, ${q(name)}, ${price}, ${qty}, ${q(key)}, 1, ${i + 1});`,
  );
}

const sqlFile = join(dir, 'seed.sql');
writeFileSync(sqlFile, statements.join('\n'));
wrangler(['d1', 'execute', DB, target, '--file', sqlFile]);
console.log(`Seeded ${PRODUCTS.length} products (${target}).`);

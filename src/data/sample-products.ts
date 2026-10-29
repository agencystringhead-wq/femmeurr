// TEMPORARY sample data. Same shape the D1 products table will have later.
// Images are picsum.photos placeholders and will be replaced by R2 images.
export interface Product {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  quantity: number;
  image_url: string;
  visible: boolean;
  sort_order: number;
}

const img = (seed: string) => `https://picsum.photos/seed/${seed}/600/600`;

export const sampleProducts: Product[] = [
  { id: 1, code: 'FM-001', name: 'Pearl Drop Earrings', price_inr: 1850, quantity: 6, image_url: img('femmeurr-pearl'), visible: true, sort_order: 1 },
  { id: 2, code: 'FM-002', name: 'Gold Plated Hoop Earrings', price_inr: 2400, quantity: 4, image_url: img('femmeurr-hoop'), visible: true, sort_order: 2 },
  { id: 3, code: 'FM-003', name: 'Solitaire Zircon Ring', price_inr: 3200, quantity: 2, image_url: img('femmeurr-ring'), visible: true, sort_order: 3 },
  { id: 4, code: 'FM-004', name: 'Twisted Band Ring', price_inr: 1500, quantity: 0, image_url: img('femmeurr-band'), visible: true, sort_order: 4 },
  { id: 5, code: 'FM-005', name: 'Layered Chain Necklace', price_inr: 4750, quantity: 5, image_url: img('femmeurr-chain'), visible: true, sort_order: 5 },
  { id: 6, code: 'FM-006', name: 'Kundan Choker Necklace', price_inr: 12500, quantity: 1, image_url: img('femmeurr-kundan'), visible: true, sort_order: 6 },
  { id: 7, code: 'FM-007', name: 'Antique Finish Bangles (Set of 2)', price_inr: 6800, quantity: 3, image_url: img('femmeurr-bangle'), visible: true, sort_order: 7 },
  { id: 8, code: 'FM-008', name: 'Slim Cuff Bangle', price_inr: 3900, quantity: 0, image_url: img('femmeurr-cuff'), visible: true, sort_order: 8 },
];

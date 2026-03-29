const db = require('./database');

const migrations = [
  // QR code for restaurants
  `ALTER TABLE restaurants ADD COLUMN qr_code TEXT DEFAULT ''`,
  `ALTER TABLE restaurants ADD COLUMN delivery_price_per_km REAL DEFAULT 0`,
  
  // Orders: sur place + payer plus tard + 7 statuts
  `ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'delivery'`,
  `ALTER TABLE orders ADD COLUMN pay_later INTEGER DEFAULT 0`,
  `ALTER TABLE orders ADD COLUMN qr_scan INTEGER DEFAULT 0`,
  `ALTER TABLE orders ADD COLUMN table_number TEXT`,
  
  // Fournisseurs
  `CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  
  // Commandes fournisseurs
  `CREATE TABLE IF NOT EXISTS supplier_orders (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    order_number TEXT UNIQUE NOT NULL,
    items TEXT NOT NULL,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    invoice_url TEXT,
    ordered_at TEXT DEFAULT (datetime('now')),
    delivered_at TEXT
  )`,
  
  // Recrutement / intervenants urgence
  `CREATE TABLE IF NOT EXISTS job_posts (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'urgence',
    status TEXT DEFAULT 'open',
    responses INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
  )`,
  
  // Réponses aux offres
  `CREATE TABLE IF NOT EXISTS job_responses (
    id TEXT PRIMARY KEY,
    job_post_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  
  // Livreur: otp fields
  `ALTER TABLE livreurs ADD COLUMN otp_code TEXT`,
  `ALTER TABLE livreurs ADD COLUMN otp_expires_at TEXT`,
  `ALTER TABLE livreurs ADD COLUMN status TEXT DEFAULT 'offline'`,
];

let ok = 0, skip = 0;
for (const sql of migrations) {
  try {
    db.exec(sql);
    ok++;
  } catch(e) {
    if (e.message.includes('already exists') || e.message.includes('duplicate column')) skip++;
    else console.error('[MIGRATE V2] Error:', e.message.slice(0,80));
  }
}
console.log(`[MIGRATE V2] Done: ${ok} applied, ${skip} skipped`);

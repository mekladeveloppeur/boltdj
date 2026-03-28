// Run this once to add new columns
const db = require('./database');

const migrations = [
  // Images
  "ALTER TABLE restaurants ADD COLUMN image_url TEXT DEFAULT ''",
  "ALTER TABLE menu_items ADD COLUMN image_url TEXT DEFAULT ''",
  // GPS livreur
  "ALTER TABLE livreurs ADD COLUMN latitude REAL",
  "ALTER TABLE livreurs ADD COLUMN longitude REAL",
  "ALTER TABLE livreurs ADD COLUMN last_seen TEXT",
  // Order tracking
  "ALTER TABLE orders ADD COLUMN livreur_lat REAL",
  "ALTER TABLE orders ADD COLUMN livreur_lng REAL",
];

for (const sql of migrations) {
  try {
    db.exec(sql);
    console.log('[MIGRATE] OK:', sql.slice(0, 50));
  } catch(e) {
    console.log('[MIGRATE] Skip (already exists):', sql.slice(0, 50));
  }
}
console.log('[MIGRATE] Done!');

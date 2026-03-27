const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../data/boltdj.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`);

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, description TEXT DEFAULT '',
  category TEXT NOT NULL, address TEXT DEFAULT '',
  quartier TEXT DEFAULT '', phone TEXT NOT NULL,
  manager_name TEXT NOT NULL, password_hash TEXT NOT NULL,
  logo_emoji TEXT DEFAULT '🍽️', delivery_time TEXT DEFAULT '25-35 min',
  delivery_fee INTEGER DEFAULT 300, min_order INTEGER DEFAULT 500,
  rating REAL DEFAULT 0, total_reviews INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', is_open INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL,
  name TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
  FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL,
  category_id TEXT, name TEXT NOT NULL, description TEXT DEFAULT '',
  price INTEGER NOT NULL, emoji TEXT DEFAULT '🍽️',
  is_available INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, phone TEXT UNIQUE NOT NULL,
  first_name TEXT DEFAULT '', last_name TEXT DEFAULT '',
  email TEXT DEFAULT '', otp_code TEXT, otp_expires_at TEXT,
  is_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL,
  label TEXT DEFAULT 'Maison', quartier TEXT NOT NULL,
  street TEXT DEFAULT '', complement TEXT DEFAULT '',
  landmark TEXT DEFAULT '', latitude REAL, longitude REAL,
  is_default INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, order_number TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL, restaurant_id TEXT NOT NULL,
  address_id TEXT, delivery_address TEXT DEFAULT '',
  subtotal INTEGER NOT NULL, delivery_fee INTEGER DEFAULT 300,
  total INTEGER NOT NULL, status TEXT DEFAULT 'pending', notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(client_id) REFERENCES clients(id),
  FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL,
  menu_item_id TEXT NOT NULL, name TEXT NOT NULL,
  price INTEGER NOT NULL, quantity INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS livreurs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  zone TEXT DEFAULT '', rating REAL DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0, status TEXT DEFAULT 'offline',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

module.exports = db;

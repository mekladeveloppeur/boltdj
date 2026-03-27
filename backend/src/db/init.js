require('dotenv').config();
const { pool } = require('./pool');

const schema = `
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- ADMINS
-- =====================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- RESTAURANTS
-- =====================
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  address TEXT,
  quartier VARCHAR(100),
  phone VARCHAR(30),
  manager_name VARCHAR(100),
  manager_phone VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255),
  logo_url VARCHAR(255),
  banner_url VARCHAR(255),
  delivery_time_min INTEGER DEFAULT 20,
  delivery_time_max INTEGER DEFAULT 40,
  min_order_amount INTEGER DEFAULT 500,
  delivery_fee INTEGER DEFAULT 300,
  rating DECIMAL(3,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending',
  is_open BOOLEAN DEFAULT false,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- MENU CATEGORIES
-- =====================
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- MENU ITEMS
-- =====================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  emoji VARCHAR(10) DEFAULT '🍽️',
  image_url VARCHAR(255),
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- CLIENTS
-- =====================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(150),
  is_verified BOOLEAN DEFAULT false,
  otp_code VARCHAR(10),
  otp_expires_at TIMESTAMP,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- CLIENT ADDRESSES
-- =====================
CREATE TABLE IF NOT EXISTS client_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Maison',
  address_text TEXT NOT NULL,
  quartier VARCHAR(100),
  complement TEXT,
  landmark TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- LIVREURS
-- =====================
CREATE TABLE IF NOT EXISTS livreurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  zone VARCHAR(100),
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- ORDERS
-- =====================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id),
  restaurant_id UUID REFERENCES restaurants(id),
  livreur_id UUID REFERENCES livreurs(id),
  address_id UUID REFERENCES client_addresses(id),
  delivery_address TEXT NOT NULL,
  delivery_quartier VARCHAR(100),
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER DEFAULT 300,
  total INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  payment_method VARCHAR(30) DEFAULT 'cash',
  payment_status VARCHAR(30) DEFAULT 'pending',
  notes TEXT,
  estimated_delivery_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancel_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- ORDER ITEMS
-- =====================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  name VARCHAR(150) NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  emoji VARCHAR(10) DEFAULT '🍽️'
);

-- =====================
-- REVIEWS
-- =====================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  client_id UUID REFERENCES clients(id),
  restaurant_id UUID REFERENCES restaurants(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- OTP LOGS (pour debug/dev)
-- =====================
CREATE TABLE IF NOT EXISTS otp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(30) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(30) DEFAULT 'login',
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- =====================
-- AUTO UPDATE updated_at
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restaurants_updated ON restaurants;
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_menu_items_updated ON menu_items;
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated ON clients;
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initialisation de la base de données BoltDj...');
    await client.query(schema);
    console.log('✅ Toutes les tables créées avec succès !');
    console.log('\nTables créées:');
    const res = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
    res.rows.forEach(r => console.log('  -', r.tablename));
  } catch (err) {
    console.error('❌ Erreur lors de l\'init DB:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();

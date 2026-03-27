const { hashPassword, verifyPassword, signToken, uuid } = require('../config/crypto');
const db = require('../config/database');
const auth = require('../middleware/auth');

module.exports = function(router) {

router.post('/restaurant/login', (req, res) => {
  const { code, password } = req.body;
  if (!code || !password) return res.status(400).json({ error: 'Code et mot de passe requis' });
  const rest = db.prepare('SELECT * FROM restaurants WHERE code=?').get(code.toUpperCase());
  if (!rest || !verifyPassword(password, rest.password_hash))
    return res.status(401).json({ error: 'Code ou mot de passe incorrect' });
  if (rest.status === 'pending') return res.status(403).json({ error: 'Restaurant en attente de validation admin' });
  if (rest.status === 'suspended') return res.status(403).json({ error: 'Restaurant suspendu' });
  const token = signToken({ id: rest.id, role: 'restaurant', name: rest.name, code: rest.code }, 86400);
  res.json({ token, restaurant: { id: rest.id, code: rest.code, name: rest.name, status: rest.status, is_open: rest.is_open, logo_emoji: rest.logo_emoji } });
});

router.get('/restaurant/me', auth(['restaurant']), (req, res) => {
  res.json(db.prepare('SELECT id,code,name,description,category,address,quartier,phone,manager_name,logo_emoji,delivery_time,delivery_fee,min_order,rating,total_reviews,status,is_open FROM restaurants WHERE id=?').get(req.user.id));
});

router.patch('/restaurant/me', auth(['restaurant']), (req, res) => {
  const { name, description, address, quartier, phone, delivery_time, delivery_fee, min_order } = req.body;
  db.prepare("UPDATE restaurants SET name=COALESCE(?,name), description=COALESCE(?,description), address=COALESCE(?,address), quartier=COALESCE(?,quartier), phone=COALESCE(?,phone), delivery_time=COALESCE(?,delivery_time), delivery_fee=COALESCE(?,delivery_fee), min_order=COALESCE(?,min_order), updated_at=datetime('now') WHERE id=?")
    .run(name||null, description||null, address||null, quartier||null, phone||null, delivery_time||null, delivery_fee||null, min_order||null, req.user.id);
  res.json({ success: true });
});

router.patch('/restaurant/toggle-open', auth(['restaurant']), (req, res) => {
  const rest = db.prepare('SELECT is_open FROM restaurants WHERE id=?').get(req.user.id);
  const newVal = rest.is_open ? 0 : 1;
  db.prepare("UPDATE restaurants SET is_open=?, updated_at=datetime('now') WHERE id=?").run(newVal, req.user.id);
  res.json({ is_open: newVal });
});

router.get('/restaurant/menu', auth(['restaurant']), (req, res) => {
  const cats = db.prepare('SELECT * FROM menu_categories WHERE restaurant_id=? ORDER BY sort_order').all(req.user.id);
  for (const c of cats) c.items = db.prepare('SELECT * FROM menu_items WHERE category_id=? ORDER BY sort_order').all(c.id);
  res.json(cats);
});

router.post('/restaurant/menu/categories', auth(['restaurant']), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const id = uuid();
  const order = db.prepare('SELECT COUNT(*) as c FROM menu_categories WHERE restaurant_id=?').get(req.user.id).c;
  db.prepare('INSERT INTO menu_categories (id,restaurant_id,name,sort_order) VALUES (?,?,?,?)').run(id, req.user.id, name, order);
  res.status(201).json({ id, name, sort_order: order, items: [] });
});

router.post('/restaurant/menu/items', auth(['restaurant']), (req, res) => {
  const { category_id, name, description, price, emoji } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Nom et prix requis' });
  const id = uuid();
  db.prepare('INSERT INTO menu_items (id,restaurant_id,category_id,name,description,price,emoji) VALUES (?,?,?,?,?,?,?)').run(id, req.user.id, category_id||null, name, description||'', parseInt(price), emoji||'🍽️');
  res.status(201).json({ id, name, description: description||'', price: parseInt(price), emoji: emoji||'🍽️', is_available: 1 });
});

router.patch('/restaurant/menu/items/:id', auth(['restaurant']), (req, res) => {
  const { name, description, price, emoji, is_available } = req.body;
  const item = db.prepare('SELECT * FROM menu_items WHERE id=? AND restaurant_id=?').get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Plat introuvable' });
  db.prepare('UPDATE menu_items SET name=?, description=?, price=?, emoji=?, is_available=? WHERE id=? AND restaurant_id=?')
    .run(name??item.name, description??item.description, price?parseInt(price):item.price, emoji??item.emoji, is_available!==undefined?(is_available?1:0):item.is_available, req.params.id, req.user.id);
  res.json({ success: true });
});

router.delete('/restaurant/menu/items/:id', auth(['restaurant']), (req, res) => {
  db.prepare('DELETE FROM menu_items WHERE id=? AND restaurant_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

router.get('/restaurant/orders', auth(['restaurant']), (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, (c.first_name||' '||c.last_name) as client_name, c.phone as client_phone
    FROM orders o LEFT JOIN clients c ON o.client_id=c.id
    WHERE o.restaurant_id=? ORDER BY o.created_at DESC LIMIT 50
  `).all(req.user.id);
  for (const o of orders) o.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id);
  res.json(orders);
});

router.patch('/restaurant/orders/:id/status', auth(['restaurant']), (req, res) => {
  const { status } = req.body;
  if (!['accepted','preparing','ready','cancelled'].includes(status))
    return res.status(400).json({ error: 'Statut invalide' });
  db.prepare("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=? AND restaurant_id=?").run(status, req.params.id, req.user.id);
  res.json({ success: true, status });
});

router.get('/restaurant/stats', auth(['restaurant']), (req, res) => {
  const id = req.user.id;
  res.json({
    todayOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE restaurant_id=? AND date(created_at)=date('now')").get(id).c,
    todayRevenue: db.prepare("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE restaurant_id=? AND status='delivered' AND date(created_at)=date('now')").get(id).s,
    monthOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE restaurant_id=? AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')").get(id).c,
    monthRevenue: db.prepare("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE restaurant_id=? AND status='delivered' AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now')").get(id).s,
    pendingOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE restaurant_id=? AND status='pending'").get(id).c,
    preparingOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE restaurant_id=? AND status IN ('accepted','preparing')").get(id).c,
  });
});

};

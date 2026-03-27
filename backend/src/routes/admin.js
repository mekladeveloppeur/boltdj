const { hashPassword, verifyPassword, signToken, uuid } = require('../config/crypto');
const db = require('../config/database');
const auth = require('../middleware/auth');

module.exports = function(router) {

router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  const admin = db.prepare('SELECT * FROM admins WHERE email=?').get(email);
  if (!admin || !verifyPassword(password, admin.password_hash))
    return res.status(401).json({ error: 'Identifiants incorrects' });
  const token = signToken({ id: admin.id, role: 'admin', name: admin.name });
  res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
});

router.get('/admin/stats', auth(['admin']), (req, res) => {
  const activeRests = db.prepare("SELECT COUNT(*) as c FROM restaurants WHERE status='active'").get().c;
  const pendingRests = db.prepare("SELECT COUNT(*) as c FROM restaurants WHERE status='pending'").get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const todayOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at)=date('now')").get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE status='delivered'").get().s;
  const todayRevenue = db.prepare("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE status='delivered' AND date(created_at)=date('now')").get().s;
  const totalClients = db.prepare('SELECT COUNT(*) as c FROM clients WHERE is_verified=1').get().c;
  const totalLivreurs = db.prepare('SELECT COUNT(*) as c FROM livreurs').get().c;
  const activeOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status IN ('pending','accepted','preparing','ready','delivering')").get().c;
  res.json({ activeRests, pendingRests, totalOrders, todayOrders, totalRevenue, todayRevenue, totalClients, totalLivreurs, activeOrders });
});

router.get('/admin/restaurants', auth(['admin']), (req, res) => {
  const { status } = req.query;
  let q = 'SELECT id,code,name,category,address,quartier,phone,manager_name,logo_emoji,rating,total_reviews,status,is_open,created_at FROM restaurants';
  const params = [];
  if (status && status !== 'all') { q += ' WHERE status=?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/admin/restaurants', auth(['admin']), (req, res) => {
  const { name, category, manager_name, phone, address, quartier, description, logo_emoji } = req.body;
  if (!name || !manager_name || !phone) return res.status(400).json({ error: 'Champs obligatoires manquants' });
  const count = db.prepare('SELECT COUNT(*) as c FROM restaurants').get().c;
  const code = 'REST' + String(count + 1).padStart(3, '0');
  const tempPwd = 'BoltDj' + Math.random().toString(36).slice(2,8).toUpperCase() + '!';
  const id = uuid();
  db.prepare('INSERT INTO restaurants (id,code,name,description,category,address,quartier,phone,manager_name,password_hash,logo_emoji) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, code, name, description||'', category||'Local', address||'', quartier||'', phone, manager_name, hashPassword(tempPwd), logo_emoji||'🍽️');
  console.log(`[SMS] Envoyer à ${phone}: Votre accès BoltDj — Code: ${code} | Mot de passe: ${tempPwd} | partner.boltdj.dj`);
  res.status(201).json({ id, code, temp_password: tempPwd, sms_preview: `Code: ${code} | MDP: ${tempPwd}` });
});

router.patch('/admin/restaurants/:id/status', auth(['admin']), (req, res) => {
  const { status } = req.body;
  if (!['active','suspended','rejected','pending'].includes(status))
    return res.status(400).json({ error: 'Statut invalide' });
  db.prepare("UPDATE restaurants SET status=?, updated_at=datetime('now') WHERE id=?").run(status, req.params.id);
  res.json({ success: true, status });
});

router.get('/admin/orders', auth(['admin']), (req, res) => {
  const orders = db.prepare(`
    SELECT o.id, o.order_number, o.total, o.status, o.created_at,
           (c.first_name||' '||c.last_name) as client_name, c.phone as client_phone,
           r.name as restaurant_name
    FROM orders o
    LEFT JOIN clients c ON o.client_id=c.id
    LEFT JOIN restaurants r ON o.restaurant_id=r.id
    ORDER BY o.created_at DESC LIMIT 100
  `).all();
  res.json(orders);
});

router.get('/admin/clients', auth(['admin']), (req, res) => {
  const clients = db.prepare(`
    SELECT c.id, c.phone, c.first_name, c.last_name, c.email, c.created_at,
           COUNT(o.id) as total_orders, COALESCE(SUM(o.total),0) as total_spent
    FROM clients c LEFT JOIN orders o ON c.id=o.client_id
    WHERE c.is_verified=1 GROUP BY c.id ORDER BY c.created_at DESC
  `).all();
  res.json(clients);
});

router.get('/admin/livreurs', auth(['admin']), (req, res) => {
  res.json(db.prepare('SELECT id,name,phone,zone,rating,total_deliveries,status,created_at FROM livreurs ORDER BY created_at DESC').all());
});

router.post('/admin/livreurs', auth(['admin']), (req, res) => {
  const { name, phone, zone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone requis' });
  const tempPwd = 'Livreur' + Math.random().toString(36).slice(2,7).toUpperCase() + '!';
  const id = uuid();
  db.prepare('INSERT INTO livreurs (id,name,phone,password_hash,zone) VALUES (?,?,?,?,?)').run(id, name, phone, hashPassword(tempPwd), zone||'');
  res.status(201).json({ id, temp_password: tempPwd });
});

};

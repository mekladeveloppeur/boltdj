const db = require('../config/database');
const auth = require('../middleware/auth');
const { uuid } = require('../config/crypto');

module.exports = function(router) {

// ── FOURNISSEURS ──────────────────────────────────────────────────────────────

// GET /api/suppliers — liste des fournisseurs du restaurant
router.get('/suppliers', auth(['restaurant']), (req, res) => {
  const list = db.prepare('SELECT * FROM suppliers WHERE restaurant_id=? ORDER BY name').all(req.user.id);
  res.json(list);
});

// POST /api/suppliers — ajouter fournisseur
router.post('/suppliers', auth(['restaurant']), (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const id = uuid();
  db.prepare('INSERT INTO suppliers (id,restaurant_id,name,phone,email,address,notes) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, name, phone||'', email||'', address||'', notes||'');
  res.status(201).json({ id, name, phone, email });
});

// DELETE /api/suppliers/:id
router.delete('/suppliers/:id', auth(['restaurant']), (req, res) => {
  db.prepare('DELETE FROM suppliers WHERE id=? AND restaurant_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ── COMMANDES FOURNISSEURS ────────────────────────────────────────────────────

// GET /api/supplier-orders — liste commandes fournisseur
router.get('/supplier-orders', auth(['restaurant']), (req, res) => {
  const orders = db.prepare(`
    SELECT so.*, s.name as supplier_name
    FROM supplier_orders so
    LEFT JOIN suppliers s ON so.supplier_id = s.id
    WHERE so.restaurant_id=?
    ORDER BY so.ordered_at DESC LIMIT 50
  `).all(req.user.id);
  for (const o of orders) {
    try { o.items_parsed = JSON.parse(o.items); } catch { o.items_parsed = []; }
  }
  res.json(orders);
});

// POST /api/supplier-orders — nouvelle commande fournisseur
router.post('/supplier-orders', auth(['restaurant']), (req, res) => {
  const { supplier_id, items, total, notes } = req.body;
  if (!supplier_id || !items) return res.status(400).json({ error: 'Fournisseur et articles requis' });
  const sup = db.prepare('SELECT id FROM suppliers WHERE id=? AND restaurant_id=?').get(supplier_id, req.user.id);
  if (!sup) return res.status(403).json({ error: 'Fournisseur introuvable' });
  const id = uuid();
  const num = 'CMD' + Date.now().toString().slice(-6);
  db.prepare('INSERT INTO supplier_orders (id,restaurant_id,supplier_id,order_number,items,total,notes) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user.id, supplier_id, num, JSON.stringify(items), total||0, notes||'');
  res.status(201).json({ id, order_number: num });
});

// PATCH /api/supplier-orders/:id/status
router.patch('/supplier-orders/:id/status', auth(['restaurant']), (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE supplier_orders SET status=? WHERE id=? AND restaurant_id=?")
    .run(status, req.params.id, req.user.id);
  if (status === 'delivered') {
    db.prepare("UPDATE supplier_orders SET delivered_at=datetime('now') WHERE id=?").run(req.params.id);
  }
  res.json({ success: true, status });
});

// ── RECRUTEMENT / INTERVENANTS ────────────────────────────────────────────────

// GET /api/jobs — offres du restaurant
router.get('/jobs', auth(['restaurant', 'admin']), (req, res) => {
  const rest_id = req.user.role === 'admin' ? req.query.restaurant_id : req.user.id;
  const where = rest_id ? 'WHERE restaurant_id=?' : '';
  const jobs = rest_id
    ? db.prepare(`SELECT * FROM job_posts ${where} ORDER BY created_at DESC`).all(rest_id)
    : db.prepare(`SELECT j.*, r.name as restaurant_name FROM job_posts j LEFT JOIN restaurants r ON j.restaurant_id=r.id ORDER BY j.created_at DESC`).all();
  res.json(jobs);
});

// POST /api/jobs — publier une offre
router.post('/jobs', auth(['restaurant']), (req, res) => {
  const { title, description, type, expires_at } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });
  const id = uuid();
  db.prepare('INSERT INTO job_posts (id,restaurant_id,title,description,type,expires_at) VALUES (?,?,?,?,?,?)')
    .run(id, req.user.id, title, description||'', type||'urgence', expires_at||null);
  res.status(201).json({ id, title });
});

// PATCH /api/jobs/:id/close
router.patch('/jobs/:id/close', auth(['restaurant']), (req, res) => {
  db.prepare("UPDATE job_posts SET status='closed' WHERE id=? AND restaurant_id=?").run(req.params.id, req.user.id);
  res.json({ success: true });
});

// DELETE /api/jobs/:id
router.delete('/jobs/:id', auth(['restaurant']), (req, res) => {
  db.prepare('DELETE FROM job_posts WHERE id=? AND restaurant_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// POST /api/jobs/:id/respond — répondre à une offre (public)
router.post('/jobs/:id/respond', (req, res) => {
  const { name, phone, message } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone requis' });
  const job = db.prepare('SELECT id FROM job_posts WHERE id=? AND status="open"').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Offre introuvable ou fermée' });
  const id = uuid();
  db.prepare('INSERT INTO job_responses (id,job_post_id,name,phone,message) VALUES (?,?,?,?,?)').run(id, req.params.id, name, phone, message||'');
  db.prepare('UPDATE job_posts SET responses=responses+1 WHERE id=?').run(req.params.id);
  res.status(201).json({ success: true });
});

// GET /api/jobs/:id/responses — voir les réponses
router.get('/jobs/:id/responses', auth(['restaurant', 'admin']), (req, res) => {
  const resps = db.prepare('SELECT * FROM job_responses WHERE job_post_id=? ORDER BY created_at DESC').all(req.params.id);
  res.json(resps);
});

};

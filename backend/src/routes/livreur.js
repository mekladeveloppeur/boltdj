const { verifyPassword, signToken, uuid } = require('../config/crypto');
const db = require('../config/database');
const auth = require('../middleware/auth');

module.exports = function(router) {

// POST /api/livreur/request-otp
router.post('/livreur/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Numéro requis' });
  const liv = db.prepare('SELECT id FROM livreurs WHERE phone=?').get(phone);
  if (!liv) return res.status(404).json({ error: 'Numéro non enregistré — contactez l\'admin BoltDj' });
  const otp = '1234'; // DEV
  const expires = new Date(Date.now() + 10*60*1000).toISOString();
  db.prepare("UPDATE livreurs SET otp_code=?, otp_expires_at=? WHERE phone=?").run(otp, expires, phone);
  console.log(`[SMS DEV] OTP livreur ${phone}: ${otp}`);
  res.json({ success: true, dev_otp: otp });
});

// POST /api/livreur/verify-otp
router.post('/livreur/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const liv = db.prepare('SELECT * FROM livreurs WHERE phone=?').get(phone);
  if (!liv) return res.status(404).json({ error: 'Livreur introuvable' });
  if (liv.otp_code !== String(otp)) return res.status(401).json({ error: 'Code incorrect' });
  if (new Date(liv.otp_expires_at) < new Date()) return res.status(401).json({ error: 'Code expiré' });
  db.prepare("UPDATE livreurs SET otp_code=NULL, otp_expires_at=NULL, status='available' WHERE phone=?").run(phone);
  const token = signToken({ id: liv.id, role: 'livreur', name: liv.name, phone: liv.phone }, 86400);
  res.json({ token, livreur: { id: liv.id, name: liv.name, phone: liv.phone, zone: liv.zone, rating: liv.rating, status: 'available' } });
});

// GET /api/livreur/me
router.get('/livreur/me', auth(['livreur']), (req, res) => {
  const liv = db.prepare('SELECT id,name,phone,zone,rating,total_deliveries,status FROM livreurs WHERE id=?').get(req.user.id);
  res.json(liv);
});

// GET /api/livreur/missions — commandes assignées ou disponibles
router.get('/livreur/missions', auth(['livreur']), (req, res) => {
  const active = db.prepare(`
    SELECT o.*, r.name as rest_name, r.address as rest_address, r.logo_emoji,
           (c.first_name||' '||c.last_name) as client_name, c.phone as client_phone,
           o.delivery_address
    FROM orders o
    LEFT JOIN restaurants r ON o.restaurant_id=r.id
    LEFT JOIN clients c ON o.client_id=c.id
    WHERE o.status='ready' OR (o.status='delivering' AND o.livreur_id=?)
    ORDER BY o.updated_at DESC LIMIT 20
  `).all(req.user.id);
  for (const o of active) o.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id);
  res.json(active);
});

// PATCH /api/livreur/missions/:id/pickup — livreur prend la commande
router.patch('/livreur/missions/:id/pickup', auth(['livreur']), (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id=? AND status='ready'").get(req.params.id);
  if (!order) return res.status(400).json({ error: 'Commande non disponible' });
  db.prepare("UPDATE orders SET status='delivering', livreur_id=?, updated_at=datetime('now') WHERE id=?").run(req.user.id, req.params.id);
  db.prepare("UPDATE livreurs SET status='delivering' WHERE id=?").run(req.user.id);
  res.json({ success: true, status: 'delivering' });
});

// PATCH /api/livreur/missions/:id/deliver — livraison confirmée
router.patch('/livreur/missions/:id/deliver', auth(['livreur']), (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id=? AND livreur_id=? AND status='delivering'").get(req.params.id, req.user.id);
  if (!order) return res.status(400).json({ error: 'Mission introuvable' });
  db.prepare("UPDATE orders SET status='delivered', updated_at=datetime('now') WHERE id=?").run(req.params.id);
  db.prepare("UPDATE livreurs SET status='available', total_deliveries=total_deliveries+1 WHERE id=?").run(req.user.id);
  res.json({ success: true, status: 'delivered' });
});

// PATCH /api/livreur/toggle-status
router.patch('/livreur/toggle-status', auth(['livreur']), (req, res) => {
  const liv = db.prepare('SELECT status FROM livreurs WHERE id=?').get(req.user.id);
  const newStatus = liv.status === 'offline' ? 'available' : 'offline';
  db.prepare('UPDATE livreurs SET status=? WHERE id=?').run(newStatus, req.user.id);
  res.json({ status: newStatus });
});

// GET /api/livreur/history
router.get('/livreur/history', auth(['livreur']), (req, res) => {
  const history = db.prepare(`
    SELECT o.order_number, o.total, o.delivery_fee, o.status, o.created_at,
           r.name as rest_name, r.logo_emoji,
           o.delivery_address,
           (c.first_name||' '||c.last_name) as client_name
    FROM orders o
    LEFT JOIN restaurants r ON o.restaurant_id=r.id
    LEFT JOIN clients c ON o.client_id=c.id
    WHERE o.livreur_id=? AND o.status='delivered'
    ORDER BY o.updated_at DESC LIMIT 30
  `).all(req.user.id);
  res.json(history);
});

};

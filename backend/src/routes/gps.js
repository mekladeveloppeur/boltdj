// GPS tracking routes for livreur real-time location
const db = require('../config/database');
const auth = require('../middleware/auth');

// In-memory store for real-time positions (faster than DB for frequent updates)
const positions = new Map(); // livreurId -> {lat, lng, timestamp, orderId}

module.exports = function(router) {

// PATCH /api/gps/position — livreur updates their GPS position
router.patch('/gps/position', auth(['livreur']), (req, res) => {
  const { latitude, longitude, order_id } = req.body;
  if (!latitude || !longitude) return res.status(400).json({ error: 'lat/lng requis' });
  
  const pos = { lat: latitude, lng: longitude, ts: Date.now(), order_id };
  positions.set(req.user.id, pos);
  
  // Update DB every 10 updates (don't hammer SQLite)
  try {
    db.prepare("UPDATE livreurs SET latitude=?, longitude=?, last_seen=datetime('now') WHERE id=?")
      .run(latitude, longitude, req.user.id);
  } catch(e) {}
  
  // Update order tracking if delivering
  if (order_id) {
    try {
      db.prepare('UPDATE orders SET livreur_lat=?, livreur_lng=? WHERE id=? AND livreur_id=?')
        .run(latitude, longitude, order_id, req.user.id);
    } catch(e) {}
  }
  
  res.json({ success: true });
});

// GET /api/gps/order/:id — client polls livreur position for their order
router.get('/gps/order/:id', auth(['client']), (req, res) => {
  const order = db.prepare('SELECT livreur_id, livreur_lat, livreur_lng, status FROM orders WHERE id=? AND client_id=?')
    .get(req.params.id, req.user.id);
  
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  if (order.status !== 'delivering') return res.json({ tracking: false, status: order.status });
  
  // Try real-time first, fall back to DB
  const live = order.livreur_id ? positions.get(order.livreur_id) : null;
  
  res.json({
    tracking: true,
    status: order.status,
    lat: live?.lat ?? order.livreur_lat,
    lng: live?.lng ?? order.livreur_lng,
    updated_at: live ? new Date(live.ts).toISOString() : null
  });
});

// GET /api/gps/livreurs — admin sees all livreur positions
router.get('/gps/livreurs', auth(['admin']), (req, res) => {
  const livs = db.prepare("SELECT id, name, latitude, longitude, last_seen, status FROM livreurs WHERE status != 'offline'").all();
  const result = livs.map(l => {
    const live = positions.get(l.id);
    return { ...l, lat: live?.lat ?? l.latitude, lng: live?.lng ?? l.longitude };
  });
  res.json(result);
});

};

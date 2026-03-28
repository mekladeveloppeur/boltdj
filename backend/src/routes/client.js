const { signToken, uuid } = require('../config/crypto');
const { sendOTP } = require('../config/sms');
const db = require('../config/database');
const auth = require('../middleware/auth');

module.exports = function(router) {

router.post('/client/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Numéro requis' });
  const isDev = process.env.NODE_ENV !== 'production';
  const otp = isDev ? '1234' : String(Math.floor(1000 + Math.random() * 9000));
  const expires = new Date(Date.now() + 10*60*1000).toISOString();
  const exists = db.prepare('SELECT id FROM clients WHERE phone=?').get(phone);
  if (exists) {
    db.prepare('UPDATE clients SET otp_code=?, otp_expires_at=? WHERE phone=?').run(otp, expires, phone);
  } else {
    db.prepare('INSERT INTO clients (id,phone,otp_code,otp_expires_at) VALUES (?,?,?,?)').run(uuid(), phone, otp, expires);
  }
  try {
    await new Promise((resolve, reject) => {
      sendOTP(phone, otp).then(resolve).catch(reject);
    });
  } catch(e) {
    console.error('[SMS] Failed:', e.message);
  }
  res.json({ success: true, ...(isDev ? { dev_otp: otp } : {}) });
});

router.post('/client/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const client = db.prepare('SELECT * FROM clients WHERE phone=?').get(phone);
  if (!client) return res.status(404).json({ error: 'Numéro non trouvé' });
  if (client.otp_code !== String(otp)) return res.status(401).json({ error: 'Code incorrect' });
  if (new Date(client.otp_expires_at) < new Date()) return res.status(401).json({ error: 'Code expiré' });
  db.prepare("UPDATE clients SET is_verified=1, otp_code=NULL, otp_expires_at=NULL, updated_at=datetime('now') WHERE phone=?").run(phone);
  const token = signToken({ id: client.id, role: 'client', phone: client.phone }, 30*86400);
  res.json({ token, is_new: !client.first_name, client: { id: client.id, phone: client.phone, first_name: client.first_name, last_name: client.last_name } });
});

router.patch('/client/profile', auth(['client']), (req, res) => {
  const { first_name, last_name, email } = req.body;
  db.prepare("UPDATE clients SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), email=COALESCE(?,email), updated_at=datetime('now') WHERE id=?").run(first_name||null, last_name||null, email||null, req.user.id);
  res.json({ success: true });
});

router.get('/client/profile', auth(['client']), (req, res) => {
  const client = db.prepare('SELECT id,phone,first_name,last_name,email,created_at FROM clients WHERE id=?').get(req.user.id);
  client.addresses = db.prepare('SELECT * FROM addresses WHERE client_id=? ORDER BY is_default DESC').all(req.user.id);
  client.order_count = db.prepare('SELECT COUNT(*) as c FROM orders WHERE client_id=?').get(req.user.id).c;
  res.json(client);
});

router.post('/client/addresses', auth(['client']), (req, res) => {
  const { label, quartier, street, complement, landmark, latitude, longitude, is_default } = req.body;
  if (!quartier) return res.status(400).json({ error: 'Quartier requis' });
  if (is_default) db.prepare('UPDATE addresses SET is_default=0 WHERE client_id=?').run(req.user.id);
  const id = uuid();
  db.prepare('INSERT INTO addresses (id,client_id,label,quartier,street,complement,landmark,latitude,longitude,is_default) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, req.user.id, label||'Maison', quartier, street||'', complement||'', landmark||'', latitude||null, longitude||null, is_default?1:0);
  res.status(201).json({ id, label, quartier, street, landmark, is_default: is_default?1:0 });
});

router.delete('/client/addresses/:id', auth(['client']), (req, res) => {
  db.prepare('DELETE FROM addresses WHERE id=? AND client_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

router.get('/client/orders', auth(['client']), (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, r.name as restaurant_name, r.logo_emoji
    FROM orders o LEFT JOIN restaurants r ON o.restaurant_id=r.id
    WHERE o.client_id=? ORDER BY o.created_at DESC
  `).all(req.user.id);
  for (const o of orders) o.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id);
  res.json(orders);
});

router.post('/client/orders', auth(['client']), (req, res) => {
  const { restaurant_id, items, address_id, delivery_address, notes } = req.body;
  if (!restaurant_id || !items?.length) return res.status(400).json({ error: 'Données incomplètes' });
  const rest = db.prepare("SELECT * FROM restaurants WHERE id=? AND status='active' AND is_open=1").get(restaurant_id);
  if (!rest) return res.status(400).json({ error: 'Restaurant non disponible' });
  let subtotal = 0;
  const enriched = [];
  for (const it of items) {
    const mi = db.prepare('SELECT * FROM menu_items WHERE id=? AND restaurant_id=? AND is_available=1').get(it.menu_item_id, restaurant_id);
    if (!mi) return res.status(400).json({ error: `Plat indisponible` });
    subtotal += mi.price * it.quantity;
    enriched.push({ menu_item_id: it.menu_item_id, name: mi.name, price: mi.price, quantity: it.quantity });
  }
  if (subtotal < rest.min_order) return res.status(400).json({ error: `Minimum: ${rest.min_order} FDJ` });
  const total = subtotal + rest.delivery_fee;
  const order_number = 'BDJ' + Date.now().toString().slice(-6);
  const oid = uuid();
  let addrText = delivery_address || '';
  if (address_id) {
    const a = db.prepare('SELECT * FROM addresses WHERE id=? AND client_id=?').get(address_id, req.user.id);
    if (a) addrText = `${a.quartier}${a.street?', '+a.street:''}${a.landmark?' — '+a.landmark:''}`;
  }
  db.prepare('INSERT INTO orders (id,order_number,client_id,restaurant_id,address_id,delivery_address,subtotal,delivery_fee,total,notes) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(oid, order_number, req.user.id, restaurant_id, address_id||null, addrText, subtotal, rest.delivery_fee, total, notes||'');
  for (const it of enriched) {
    db.prepare('INSERT INTO order_items (id,order_id,menu_item_id,name,price,quantity) VALUES (?,?,?,?,?,?)').run(uuid(), oid, it.menu_item_id, it.name, it.price, it.quantity);
  }
  res.status(201).json({ id: oid, order_number, total, delivery_fee: rest.delivery_fee, status: 'pending' });
});

};

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const auth = require('../middleware/auth');
const { sendRestaurantCredentials } = require('../utils/sms');

// GET /api/admin/restaurants  — liste complète
router.get('/', auth(['admin','superadmin']), async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `SELECT r.*, 
      COUNT(DISTINCT o.id) FILTER (WHERE o.created_at > NOW()-INTERVAL '30 days') AS orders_this_month
      FROM restaurants r
      LEFT JOIN orders o ON o.restaurant_id = r.id
      WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql += ` AND r.status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (r.name ILIKE $${params.length} OR r.quartier ILIKE $${params.length})`; }
    sql += ' GROUP BY r.id ORDER BY r.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/restaurants/stats
router.get('/stats', auth(['admin','superadmin']), async (req, res) => {
  try {
    const [total, active, pending, ordersToday, revenueToday] = await Promise.all([
      query('SELECT COUNT(*) FROM restaurants'),
      query("SELECT COUNT(*) FROM restaurants WHERE status='active'"),
      query("SELECT COUNT(*) FROM restaurants WHERE status='pending'"),
      query("SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE"),
      query("SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE created_at::date = CURRENT_DATE AND status NOT IN ('cancelled')"),
    ]);
    res.json({
      totalRestaurants: parseInt(total.rows[0].count),
      activeRestaurants: parseInt(active.rows[0].count),
      pendingRestaurants: parseInt(pending.rows[0].count),
      ordersToday: parseInt(ordersToday.rows[0].count),
      revenueToday: parseInt(revenueToday.rows[0].total),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/restaurants  — créer un restaurant + envoyer SMS
router.post('/', auth(['admin','superadmin']), async (req, res) => {
  const { name, category, manager_name, manager_phone, address, quartier, description } = req.body;
  if (!name || !manager_phone) return res.status(400).json({ error: 'Nom et téléphone du gérant requis' });
  try {
    // Générer un code unique
    const countRes = await query('SELECT COUNT(*) FROM restaurants');
    const nextNum = parseInt(countRes.rows[0].count) + 1;
    const restaurant_code = `REST${String(nextNum).padStart(3,'0')}`;
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await query(`
      INSERT INTO restaurants (restaurant_code, name, description, category, address, quartier, manager_name, manager_phone, password_hash, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *`,
      [restaurant_code, name, description||'', category||'', address||'', quartier||'', manager_name||'', manager_phone, passwordHash]
    );
    const rest = result.rows[0];

    // Envoyer SMS (DEMO en dev)
    await sendRestaurantCredentials(manager_phone, restaurant_code, tempPassword, name);

    res.status(201).json({
      ...rest,
      temp_password: tempPassword, // retourné une seule fois
      message: `Restaurant créé. SMS envoyé à ${manager_phone}`
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/restaurants/:id/status  — valider / suspendre / refuser
router.patch('/:id/status', auth(['admin','superadmin']), async (req, res) => {
  const { status } = req.body;
  const allowed = ['active','suspended','rejected','pending'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  try {
    const result = await query(
      'UPDATE restaurants SET status=$1, is_open=($2) WHERE id=$3 RETURNING *',
      [status, status === 'active', req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Restaurant introuvable' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/restaurants/:id
router.delete('/:id', auth(['superadmin']), async (req, res) => {
  try {
    await query('DELETE FROM restaurants WHERE id=$1', [req.params.id]);
    res.json({ message: 'Restaurant supprimé' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

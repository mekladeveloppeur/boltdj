const router = require('express').Router();
const { query } = require('../db/pool');
const auth = require('../middleware/auth');

// ---- ORDERS ----
router.get('/orders', auth(['admin','superadmin']), async (req, res) => {
  try {
    const { status, date } = req.query;
    let sql = `SELECT o.*, c.first_name, c.last_name, r.name as restaurant_name, l.name as livreur_name
      FROM orders o
      JOIN clients c ON c.id=o.client_id
      JOIN restaurants r ON r.id=o.restaurant_id
      LEFT JOIN livreurs l ON l.id=o.livreur_id
      WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql += ` AND o.status=$${params.length}`; }
    if (date) { params.push(date); sql += ` AND o.created_at::date=$${params.length}`; }
    sql += ' ORDER BY o.created_at DESC LIMIT 100';
    const r = await query(sql, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- CLIENTS ----
router.get('/clients', auth(['admin','superadmin']), async (req, res) => {
  try {
    const r = await query(`SELECT c.*, 
      COALESCE(SUM(o.total),0) as total_spent,
      COUNT(o.id) as orders_count
      FROM clients c
      LEFT JOIN orders o ON o.client_id=c.id AND o.status='delivered'
      GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- LIVREURS ----
router.get('/livreurs', auth(['admin','superadmin']), async (req, res) => {
  try {
    const r = await query('SELECT * FROM livreurs ORDER BY is_online DESC, name');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/livreurs', auth(['admin','superadmin']), async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, phone, zone, password } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone requis' });
  try {
    const hash = await bcrypt.hash(password || 'livr123', 10);
    const r = await query(
      'INSERT INTO livreurs (name,phone,password_hash,zone) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, phone, hash, zone||'']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

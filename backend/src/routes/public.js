const db = require('../config/database');

module.exports = function(router) {

router.get('/restaurants', (req, res) => {
  const { category } = req.query;
  let q = "SELECT id,code,name,description,category,quartier,logo_emoji,delivery_time,delivery_fee,min_order,rating,total_reviews,is_open FROM restaurants WHERE status='active'";
  const params = [];
  if (category && category !== 'all') { q += ' AND category=?'; params.push(category); }
  q += ' ORDER BY rating DESC';
  res.json(db.prepare(q).all(...params));
});

router.get('/restaurants/:id', (req, res) => {
  const rest = db.prepare("SELECT id,code,name,description,category,address,quartier,logo_emoji,delivery_time,delivery_fee,min_order,rating,total_reviews,is_open FROM restaurants WHERE id=? AND status='active'").get(req.params.id);
  if (!rest) return res.status(404).json({ error: 'Introuvable' });
  const cats = db.prepare('SELECT * FROM menu_categories WHERE restaurant_id=? ORDER BY sort_order').all(rest.id);
  for (const c of cats) c.items = db.prepare('SELECT id,name,description,price,emoji,is_available FROM menu_items WHERE category_id=? ORDER BY sort_order').all(c.id);
  rest.menu = cats;
  res.json(rest);
});

router.get('/categories', (req, res) => {
  res.json(db.prepare("SELECT DISTINCT category FROM restaurants WHERE status='active' ORDER BY category").all().map(r => r.category));
});

};

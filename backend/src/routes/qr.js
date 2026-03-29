// QR Code generation — no external deps, uses pure SVG QR
const db = require('../config/database');
const auth = require('../middleware/auth');

// Simple QR code generator using a public API (goqr.me — free, no key needed)
// Returns an SVG/PNG URL that the frontend can embed directly

module.exports = function(router) {

// GET /api/qr/:restaurant_id — get QR code URL for a restaurant
router.get('/qr/:restaurant_id', (req, res) => {
  const rest = db.prepare('SELECT id, name, code FROM restaurants WHERE id=? AND status="active"').get(req.params.restaurant_id);
  if (!rest) return res.status(404).json({ error: 'Restaurant introuvable' });
  
  // The QR encodes the client URL with the restaurant pre-selected
  const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
  const clientUrl = `${baseUrl}/client?restaurant=${rest.id}&source=qr&type=dine_in`;
  
  // Use goqr.me free API to generate QR
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clientUrl)}&bgcolor=ffffff&color=6C5CE7&margin=10`;
  
  res.json({
    restaurant_id: rest.id,
    restaurant_name: rest.name,
    client_url: clientUrl,
    qr_image_url: qrApiUrl,
    qr_svg_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clientUrl)}&bgcolor=ffffff&color=6C5CE7&margin=10&format=svg`
  });
});

// GET /api/qr/restaurant/mine — restaurant gets its own QR
router.get('/qr/restaurant/mine', auth(['restaurant']), (req, res) => {
  const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
  const clientUrl = `${baseUrl}/client?restaurant=${req.user.id}&source=qr&type=dine_in`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clientUrl)}&bgcolor=ffffff&color=6C5CE7&margin=10`;
  
  res.json({
    client_url: clientUrl,
    qr_image_url: qrApiUrl,
    instructions: 'Imprimez ce QR et placez-le sur les tables. Les clients scanneront pour commander sur place.'
  });
});

};

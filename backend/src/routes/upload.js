// Image upload route — handles base64 images from frontend
const { uploadImage } = require('../config/cloudinary');
const auth = require('../middleware/auth');

module.exports = function(router) {

// POST /api/upload/image — upload une image, retourne l'URL
// Roles: admin (restaurant photos), restaurant (menu item photos)
router.post('/upload/image', auth(['admin','restaurant']), async (req, res) => {
  const { image, folder } = req.body;
  if (!image) return res.status(400).json({ error: 'Image base64 requis' });
  
  // Validate size (max 5MB base64 ≈ 3.75MB actual)
  if (image.length > 7 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image trop grande (max 5MB)' });
  }
  
  const uploadFolder = req.user.role === 'admin' ? 'boltdj/restaurants' : 'boltdj/menu';
  
  try {
    const url = await uploadImage(image, folder || uploadFolder);
    res.json({ success: true, url });
  } catch(e) {
    console.error('[UPLOAD] Error:', e.message);
    res.status(500).json({ error: 'Erreur upload: ' + e.message });
  }
});

};

const { verifyToken } = require('../config/crypto');

const auth = (roles = []) => (req, res, next) => {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token manquant' });
  try {
    const payload = verifyToken(header.slice(7));
    if (roles.length && !roles.includes(payload.role))
      return res.status(403).json({ error: 'Accès refusé' });
    req.user = payload;
    next();
  } catch(e) {
    return res.status(401).json({ error: 'Token invalide: ' + e.message });
  }
};
module.exports = auth;

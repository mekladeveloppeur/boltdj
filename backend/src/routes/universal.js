const { verifyPassword, signToken } = require('../config/crypto');
const db = require('../config/database');

module.exports = function(router) {

// POST /api/auth/login — détecte automatiquement le rôle
router.post('/auth/login', async (req, res) => {
  const { identifier, password, otp, phone } = req.body;

  // 1. Tenter login ADMIN par email
  if (identifier && identifier.includes('@')) {
    const admin = db.prepare('SELECT * FROM admins WHERE email=?').get(identifier);
    if (admin && password && verifyPassword(password, admin.password_hash)) {
      const token = signToken({ id: admin.id, role: 'admin', name: admin.name });
      return res.json({ role: 'admin', token, name: admin.name });
    }
  }

  // 2. Tenter login RESTAURANT par code
  if (identifier && identifier.toUpperCase().startsWith('REST')) {
    const rest = db.prepare('SELECT * FROM restaurants WHERE code=?').get(identifier.toUpperCase());
    if (rest && password && verifyPassword(password, rest.password_hash)) {
      if (rest.status === 'pending') return res.status(403).json({ error: 'En attente de validation admin' });
      if (rest.status === 'suspended') return res.status(403).json({ error: 'Compte suspendu' });
      const token = signToken({ id: rest.id, role: 'restaurant', name: rest.name, code: rest.code });
      return res.json({ role: 'restaurant', token, name: rest.name, logo: rest.logo_emoji, code: rest.code });
    }
  }

  // 3. Tenter OTP CLIENT
  if (phone && otp) {
    const client = db.prepare('SELECT * FROM clients WHERE phone=?').get(phone);
    if (client && client.otp_code === String(otp)) {
      if (new Date(client.otp_expires_at) < new Date()) return res.status(401).json({ error: 'Code OTP expiré' });
      db.prepare("UPDATE clients SET is_verified=1, otp_code=NULL, otp_expires_at=NULL WHERE phone=?").run(phone);
      const token = signToken({ id: client.id, role: 'client', phone: client.phone }, 30*86400);
      return res.json({ role: 'client', token, is_new: !client.first_name,
        name: client.first_name ? client.first_name + ' ' + (client.last_name||'') : null });
    }
  }

  // 4. Tenter OTP LIVREUR
  if (phone && otp) {
    const liv = db.prepare('SELECT * FROM livreurs WHERE phone=?').get(phone);
    if (liv && liv.otp_code === String(otp)) {
      if (new Date(liv.otp_expires_at) < new Date()) return res.status(401).json({ error: 'Code OTP expiré' });
      db.prepare("UPDATE livreurs SET otp_code=NULL, otp_expires_at=NULL, status='available' WHERE phone=?").run(phone);
      const token = signToken({ id: liv.id, role: 'livreur', name: liv.name, phone: liv.phone });
      return res.json({ role: 'livreur', token, name: liv.name });
    }
  }

  // 5. Demander OTP pour numéro de téléphone
  if (phone && !otp) {
    const client = db.prepare('SELECT id FROM clients WHERE phone=?').get(phone);
    const livreur = db.prepare('SELECT id FROM livreurs WHERE phone=?').get(phone);
    if (!client && !livreur) {
      // Nouveau client — créer
      const { uuid } = require('../config/crypto');
      const smsOk2 = process.env.TWILIO_SID || process.env.AT_API_KEY;
      const newOtp = smsOk2 ? String(Math.floor(1000 + Math.random() * 9000)) : '1234';
      db.prepare('INSERT INTO clients (id, phone, otp_code, otp_expires_at) VALUES (?,?,?,?)').run(
        uuid(), phone, newOtp, new Date(Date.now()+10*60*1000).toISOString()
      );
      let newSmsSent = false;
      if (smsOk2) { try { const {sendOTP}=require('../config/sms'); await sendOTP(phone,newOtp); newSmsSent=true; } catch(e){} }
      console.log(`[SMS] Nouveau client OTP ${phone}: ${newOtp} (sent=${newSmsSent})`);
      return res.json({ needs_otp: true, user_type: 'client', dev_otp: newSmsSent ? undefined : newOtp });
    }
    const smsOk = process.env.TWILIO_SID || process.env.AT_API_KEY || process.env.CALLMEBOT_API_KEY;
    const otp_code = smsOk ? String(Math.floor(1000 + Math.random() * 9000)) : '1234';
    const expires = new Date(Date.now()+10*60*1000).toISOString();
    if (client) db.prepare('UPDATE clients SET otp_code=?, otp_expires_at=? WHERE phone=?').run(otp_code, expires, phone);
    if (livreur) db.prepare('UPDATE livreurs SET otp_code=?, otp_expires_at=? WHERE phone=?').run(otp_code, expires, phone);
    // Try real SMS if configured
    let smsSent = false;
    if (smsOk) {
      try {
        const { sendOTP } = require('../config/sms');
        await sendOTP(phone, otp_code);
        smsSent = true;
      } catch(e) { console.error('[SMS]', e.message); }
    }
    console.log(`[SMS] OTP pour ${phone}: ${otp_code} (sent=${smsSent})`);
    // Always return otp in response if SMS not sent — works with any number for testing
    return res.json({ needs_otp: true, user_type: livreur ? 'livreur' : 'client', dev_otp: smsSent ? undefined : otp_code });
  }

  return res.status(401).json({ error: 'Identifiants incorrects' });
});

};

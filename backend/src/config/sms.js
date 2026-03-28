// SMS + WhatsApp OTP sender
// Providers: Twilio (SMS), CallMeBot (WhatsApp free), Africa's Talking

const https = require('node:https');

const PROVIDER = process.env.SMS_PROVIDER || 'dev'; // 'twilio' | 'africastalking' | 'callmebot' | 'dev'

// ── TWILIO ────────────────────────────────────────────────────────────────────
async function sendTwilio(to, message) {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from = process.env.TWILIO_FROM; // e.g. +15556667777
  const body = new URLSearchParams({ To: to, From: from, Body: message }).toString();
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${sid}/Messages.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const j = JSON.parse(d);
        if (j.sid) resolve({ success: true, sid: j.sid });
        else reject(new Error(j.message || 'Twilio error'));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── AFRICA'S TALKING ─────────────────────────────────────────────────────────
async function sendAT(to, message) {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME || 'sandbox';
  const body = new URLSearchParams({ username, to, message }).toString();
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.africastalking.com',
      path: '/version1/messaging',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey,
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ success: true }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── CALLMEBOT (WhatsApp GRATUIT) ─────────────────────────────────────────────
// 1. Envoyer "I allow callmebot to send me messages" à +34 644 61 33 56 sur WhatsApp
// 2. Recevoir votre apikey
// 3. Définir CALLMEBOT_API_KEY dans Railway
async function sendWhatsApp(to, message) {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  // to = numéro international sans + ex: "25377112233"
  const phone = to.replace('+', '').replace(/\s/g, '');
  const encoded = encodeURIComponent(message);
  
  return new Promise((resolve, reject) => {
    https.get(
      `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`,
      res => { resolve({ success: true, status: res.statusCode }); }
    ).on('error', reject);
  });
}

// ── MAIN SEND FUNCTION ───────────────────────────────────────────────────────
async function sendOTP(phone, otp, lang = 'fr') {
  const messages = {
    fr: `BoltDj - Votre code de vérification est: ${otp}\nValable 10 minutes.`,
    en: `BoltDj - Your verification code is: ${otp}\nValid for 10 minutes.`
  };
  const message = messages[lang] || messages.fr;

  console.log(`[SMS] Sending OTP ${otp} to ${phone} via ${PROVIDER}`);

  if (PROVIDER === 'dev') {
    // Development: just log
    console.log(`[SMS DEV] ==============================`);
    console.log(`[SMS DEV] TO: ${phone}`);
    console.log(`[SMS DEV] OTP: ${otp}`);
    console.log(`[SMS DEV] MSG: ${message}`);
    console.log(`[SMS DEV] ==============================`);
    return { success: true, dev: true };
  }

  if (PROVIDER === 'twilio') return sendTwilio(phone, message);
  if (PROVIDER === 'africastalking') return sendAT(phone, message);
  if (PROVIDER === 'whatsapp') return sendWhatsApp(phone, message);
  
  throw new Error(`Unknown SMS provider: ${PROVIDER}`);
}

module.exports = { sendOTP };

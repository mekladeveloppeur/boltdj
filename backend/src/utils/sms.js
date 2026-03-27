require('dotenv').config();

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const sendSMS = async (phone, message) => {
  const provider = process.env.SMS_PROVIDER || 'DEMO';

  if (provider === 'DEMO') {
    console.log(`\n📱 [SMS DEMO] → ${phone}`);
    console.log(`   Message: ${message}`);
    console.log(`   (En prod, activer SMS_PROVIDER=twilio dans .env)\n`);
    return { success: true, demo: true };
  }

  if (provider === 'twilio') {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    return { success: true, sid: msg.sid };
  }

  throw new Error(`SMS provider inconnu: ${provider}`);
};

const sendOTP = async (phone, otp) => {
  const message = `BoltDjibouti: Votre code de vérification est ${otp}. Valable 10 minutes.`;
  return sendSMS(phone, message);
};

const sendRestaurantCredentials = async (phone, code, password, name) => {
  const message = `BoltDj: Restaurant "${name}" créé ! Connectez-vous sur partner.boltdj.dj avec ID: ${code} et mot de passe: ${password}`;
  return sendSMS(phone, message);
};

module.exports = { generateOTP, sendOTP, sendSMS, sendRestaurantCredentials };

// Cloudinary image upload helper
// Sign up free at cloudinary.com → get CLOUD_NAME, API_KEY, API_SECRET

const https = require('node:https');
const crypto = require('node:crypto');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

function isConfigured() {
  return CLOUD_NAME && API_KEY && API_SECRET;
}

// Upload base64 image to Cloudinary, return secure_url
async function uploadImage(base64Data, folder = 'boltdj') {
  if (!isConfigured()) {
    // Dev mode: return a placeholder
    console.log('[CLOUDINARY] Not configured — using placeholder');
    return 'https://via.placeholder.com/400x300?text=BoltDj';
  }

  // Strip data URI prefix if present
  const data = base64Data.replace(/^data:image\/\w+;base64,/, '');
  
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1')
    .update(params + API_SECRET)
    .digest('hex');

  const boundary = '----BoltDjBoundary' + Date.now();
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"',
    '',
    `data:image/jpeg;base64,${data}`,
    `--${boundary}`,
    'Content-Disposition: form-data; name="api_key"',
    '',
    API_KEY,
    `--${boundary}`,
    'Content-Disposition: form-data; name="timestamp"',
    '',
    String(timestamp),
    `--${boundary}`,
    'Content-Disposition: form-data; name="folder"',
    '',
    folder,
    `--${boundary}`,
    'Content-Disposition: form-data; name="signature"',
    '',
    signature,
    `--${boundary}--`
  ].join('\r\n');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.secure_url) resolve(json.secure_url);
          else reject(new Error(json.error?.message || 'Upload failed'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { uploadImage, isConfigured };

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

// Load .env manually (no dotenv needed)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath,'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  });
}

// Auto-seed database on first launch
try {
  require('./config/auto-seed')()
} catch (e) {
  console.log('Auto-seed disabled:', e.message)
}

// ── Router ────────────────────────────────────────────────────────────────────
const routes = { GET:{}, POST:{}, PATCH:{}, DELETE:{} };
function router(method, pattern, ...handlers) { routes[method][pattern] = handlers; }
router.get  = (p,...h) => router('GET',p,...h);
router.post = (p,...h) => router('POST',p,...h);
router.patch= (p,...h) => router('PATCH',p,...h);
router.delete=(p,...h) => router('DELETE',p,...h);

require('./routes/admin')(router);
require('./routes/restaurant')(router);
require('./routes/client')(router);
require('./routes/livreur')(router);
require('./routes/public')(router);
require('./routes/universal')(router);
require('./routes/upload')(router);
require('./routes/gps')(router);
require('./routes/suppliers')(router);
require('./routes/qr')(router);

function matchRoute(method, pathname) {
  const table = routes[method] || {};
  for (const [pattern, handlers] of Object.entries(table)) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([^/]+)/g, (_,k) => { keys.push(k); return '([^/]+)'; }) + '$');
    const m = pathname.match(re);
    if (m) {
      const params = {};
      keys.forEach((k,i) => params[k] = decodeURIComponent(m[i+1]));
      return { handlers, params };
    }
  }
  return null;
}

// ── Static file serving ───────────────────────────────────────────────────────
const mime = {
  '.html':'text/html;charset=utf-8',
  '.js':'application/javascript',
  '.css':'text/css',
  '.json':'application/json',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
  '.woff2':'font/woff2'
};

// PUBLIC dir is INSIDE backend/ — works on Railway when only backend/ is deployed
const PUBLIC_DIR = path.join(__dirname, '../public');

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const idx = path.join(filePath, 'index.html');
    if (fs.existsSync(idx)) { serveStatic(res, idx); return true; }
    return false;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mime[ext] || 'text/plain',
    'Cache-Control': 'public,max-age=3600',
    'Content-Length': stat.size
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = parsed.pathname;

  // Normalize trailing slash
  if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0,-1);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── STATIC FRONTENDS ── served from backend/public/
  // /admin → backend/public/admin/index.html
  // /restaurant → backend/public/restaurant/index.html
  // /client → backend/public/client/index.html
  // /livreur → backend/public/livreur/index.html
  const staticPrefixes = ['/admin', '/restaurant', '/client', '/livreur'];
  for (const prefix of staticPrefixes) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      const rel = pathname.slice(prefix.length) || '';
      // Try exact file first
      if (rel && rel !== '/') {
        const fp = path.join(PUBLIC_DIR, prefix.slice(1), rel);
        if (serveStatic(res, fp)) return;
      }
      // Fallback to SPA index.html
      const idx = path.join(PUBLIC_DIR, prefix.slice(1), 'index.html');
      if (serveStatic(res, idx)) return;
      res.writeHead(404); res.end('Frontend not found at: ' + idx);
      return;
    }
  }

  // ── PWA FILES ──
  if (pathname === '/manifest.json') {
    const mf = path.join(PUBLIC_DIR, 'manifest.json');
    if (serveStatic(res, mf)) return;
  }
  if (pathname === '/sw.js') {
    const sw = path.join(PUBLIC_DIR, 'sw.js');
    if (serveStatic(res, sw)) return;
  }
  // ── ROOT PAGE ──
  if (pathname === '' || pathname === '/') {
    const htmlExists = (p) => fs.existsSync(path.join(PUBLIC_DIR, p, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BoltDj ⚡</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#F8F7FF;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{background:#fff;border-radius:24px;padding:40px 32px;max-width:440px;width:100%;border:1px solid #EDE9FF;text-align:center}
.logo{font-size:48px;margin-bottom:8px}
h1{font-size:28px;font-weight:800;color:#6C5CE7;margin-bottom:6px}
.sub{font-size:14px;color:#636E72;margin-bottom:28px}
.portal{display:block;margin-bottom:12px;padding:16px 20px;background:#F8F7FF;border:1.5px solid #EDE9FF;border-radius:14px;text-decoration:none;color:#2D3436;transition:all .15s;cursor:pointer}
.portal:hover{background:#EEF0FF;border-color:#6C5CE7;transform:translateY(-1px)}
.portal-row{display:flex;align-items:center;justify-content:space-between}
.portal-left{display:flex;align-items:center;gap:12px;font-size:15px;font-weight:700}
.portal-ic{font-size:24px}
.portal-creds{font-size:11px;color:#B2BEC3;text-align:right;line-height:1.5}
.status{display:inline-flex;align-items:center;gap:6px;background:#E8FBF6;color:#007A60;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:20px}
.dot{width:8px;height:8px;border-radius:50%;background:#00B894}
.api-link{display:block;margin-top:14px;font-size:12px;color:#6C5CE7;text-decoration:none}
</style></head>
<body><div class="box">
<div class="logo">⚡</div>
<h1>BoltDj</h1>
<p class="sub">Plateforme de livraison de nourriture · Djibouti 🇩🇯</p>
<div class="status"><span class="dot"></span>Serveur opérationnel</div>
<a href="/admin" class="portal"><div class="portal-row"><div class="portal-left"><span class="portal-ic">🔐</span>Dashboard Admin</div><div class="portal-creds">${htmlExists('admin')?'✅ En ligne':'❌ Manquant'}<br>admin@boltdj.dj / Admin2026!</div></div></a>
<a href="/restaurant" class="portal"><div class="portal-row"><div class="portal-left"><span class="portal-ic">🏪</span>Dashboard Restaurant</div><div class="portal-creds">${htmlExists('restaurant')?'✅ En ligne':'❌ Manquant'}<br>REST001 / Restaurant2026!</div></div></a>
<a href="/client" class="portal"><div class="portal-row"><div class="portal-left"><span class="portal-ic">📱</span>App Client</div><div class="portal-creds">${htmlExists('client')?'✅ En ligne':'❌ Manquant'}<br>+25377112233 / OTP: 1234</div></div></a>
<a href="/livreur" class="portal"><div class="portal-row"><div class="portal-left"><span class="portal-ic">🛵</span>App Livreur</div><div class="portal-creds">${htmlExists('livreur')?'✅ En ligne':'❌ Manquant'}<br>+25377102030 / OTP: 1234</div></div></a>
<a href="/api/restaurants" class="api-link">🍽️ API publique → /api/restaurants</a>
</div></body></html>`);
    return;
  }

  // ── API HEALTH ──
  if (pathname === '/api/health') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ status:'ok', time: new Date().toISOString(), publicDir: PUBLIC_DIR, adminExists: fs.existsSync(path.join(PUBLIC_DIR,'admin','index.html')) }));
    return;
  }

  // ── API ROUTES ──
  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.slice(4);
    const match = matchRoute(req.method, apiPath);
    if (!match) {
      res.writeHead(404, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'Route introuvable: ' + req.method + ' ' + apiPath }));
      return;
    }

    // Parse body
    let body = {};
    if (['POST','PATCH','PUT'].includes(req.method)) {
      await new Promise(resolve => {
        let raw = '';
        req.on('data', d => raw += d);
        req.on('end', () => {
          try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
          resolve();
        });
      });
    }

    const fakeReq = { method:req.method, headers:req.headers, query:parsed.query, params:match.params, body, user:null };
    const fakeRes = {
      _code:200, _headers:{'Content-Type':'application/json'}, _sent:false,
      status(c) { this._code=c; return this; },
      json(data) {
        if (this._sent) return;
        this._sent = true;
        res.writeHead(this._code, this._headers);
        res.end(JSON.stringify(data));
      },
      setHeader(k,v) { this._headers[k]=v; }
    };

    let i = 0;
    const next = (err) => {
      if (err) {
        if (!fakeRes._sent) {
          res.writeHead(500, {'Content-Type':'application/json'});
          res.end(JSON.stringify({ error: err.message || String(err) }));
        }
        return;
      }
      if (i >= match.handlers.length) return;
      const h = match.handlers[i++];
      try { h(fakeReq, fakeRes, next); } catch(e) { next(e); }
    };
    next();
    return;
  }

  // ── 404 ──
  res.writeHead(404, {'Content-Type':'text/plain'});
  res.end('Not found: ' + pathname);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 BoltDj → http://localhost:${PORT}`);
  console.log(`   Public dir: ${PUBLIC_DIR}`);
  console.log(`   Admin HTML exists: ${fs.existsSync(path.join(PUBLIC_DIR,'admin','index.html'))}`);
  console.log(`   Restaurant HTML: ${fs.existsSync(path.join(PUBLIC_DIR,'restaurant','index.html'))}`);
  console.log(`   Client HTML: ${fs.existsSync(path.join(PUBLIC_DIR,'client','index.html'))}`);
  console.log(`   Livreur HTML: ${fs.existsSync(path.join(PUBLIC_DIR,'livreur','index.html'))}\n`);
});
// This line is already in the file — we need to patch it properly

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// chemin DB (Railway compatible)
const dbPath = path.resolve(process.env.DB_PATH || './data/boltdj.db');

// créer dossier data si pas existe
const fs = require('fs');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database error:', err.message);
  } else {
    console.log('✅ SQLite connecté:', dbPath);
  }
});

module.exports = db;

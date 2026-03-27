const fs = require('fs');
const path = require('path');

function autoSeed() {
  const dbPath = path.resolve(process.env.DB_PATH || './data/boltdj.db');
  const isNew = !fs.existsSync(dbPath);
  if (isNew) {
    console.log('[AUTO-SEED] Nouvelle base détectée — initialisation...');
    require('./seed');
  } else {
    console.log('[AUTO-SEED] Base existante — skip seed.');
  }
}

module.exports = autoSeed;

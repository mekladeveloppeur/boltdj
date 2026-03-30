const fs = require('fs');
const path = require('path');

function autoSeed() {
  // Migration safe
  try {
    require('./migrate');
  } catch (e) {
    console.log('[AUTO-SEED] Migration skipped:', e.message);
  }

  const dbPath = path.resolve(process.env.DB_PATH || './data/boltdj.db');
  const isNew = !fs.existsSync(dbPath);

  if (isNew) {
    console.log('[AUTO-SEED] Nouvelle base — init');

    try {
      require('./seed');
    } catch (e) {
      console.log('[AUTO-SEED] Seed skipped:', e.message);
    }

  } else {
    console.log('[AUTO-SEED] Base existante — skip');
  }
}

module.exports = autoSeed;

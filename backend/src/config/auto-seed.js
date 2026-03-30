const fs = require('fs');
const path = require('path');

function autoSeed() {
  console.log('[AUTO-SEED] safe mode');

  // Migration (optionnel)
  try {
    require('./migrate');
  } catch (e) {
    console.log('[AUTO-SEED] Migration skipped');
  }

  // IMPORTANT → on ne fait PLUS seed
  console.log('[AUTO-SEED] seed disabled');
}

module.exports = autoSeed;

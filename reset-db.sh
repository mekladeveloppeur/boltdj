#!/bin/bash
echo "⚠️  Réinitialisation de la base de données..."
cd "$(dirname "$0")"
rm -f backend/data/boltdj.db
node --experimental-sqlite backend/src/config/seed.js
echo "✅ Base remise à zéro !"

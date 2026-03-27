#!/bin/bash
echo "🚀 Démarrage BoltDj..."
cd "$(dirname "$0")"
node --experimental-sqlite backend/src/index.js

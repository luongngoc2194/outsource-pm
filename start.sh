#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Chua cai Node.js (https://nodejs.org)"; exit 1; }
[ -d node_modules ] || npm install
(sleep 3; (xdg-open http://localhost:3000 || open http://localhost:3000) >/dev/null 2>&1) &
node backend/server.js

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Node 22+ experimental localStorage breaks vitest/jsdom when NODE_OPTIONS is set.
unset NODE_OPTIONS
npm ci --prefer-offline 2>/dev/null || npm install
npm run build
npm test

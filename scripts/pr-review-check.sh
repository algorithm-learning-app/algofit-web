#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --prefer-offline 2>/dev/null || npm install
npm run build

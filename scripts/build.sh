#!/usr/bin/env bash
# Run all build steps in order. Each step is idempotent — re-running
# without changes is a no-op.
#
# Usage:
#   ./scripts/build.sh           # full build (CSS + SW + sitemap)
#   ./scripts/build.sh --stats   # also refresh data/stats.json from GitHub

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REFRESH_STATS=0
for arg in "$@"; do
  case "$arg" in
    --stats|-s) REFRESH_STATS=1 ;;
    *) echo "unknown flag: $arg"; exit 2 ;;
  esac
done

echo "━━━ build-css ━━━"
bash scripts/build-css.sh

if [[ $REFRESH_STATS -eq 1 ]]; then
  echo "━━━ fetch-github-stats ━━━"
  bash scripts/fetch-github-stats.sh
fi

echo "━━━ generate-feeds ━━━"
python3 scripts/generate-feeds.py

echo "━━━ generate-search-index ━━━"
python3 scripts/generate-search-index.py

echo "━━━ generate-sitemap ━━━"
python3 scripts/generate-sitemap.py

echo "━━━ update-sw-cache ━━━"
python3 scripts/update-sw-cache.py

echo
echo "✓ build complete"

#!/usr/bin/env bash
# Fetches public GitHub data for mahmoodhamdi and writes data/stats.json.
# Uses unauthenticated REST API (60 req/hour). Safe to run via cron / GitHub Actions.
#
# Output: data/stats.json with:
#   - summary: merged PR count, public repos, followers
#   - topRepos: top external repos by merged PR count
#   - latestPRs: 5 most recent merged PRs
#   - heatmap: per-day event count for last 90 days (from public events)

set -euo pipefail

USER="${GITHUB_USER:-mahmoodhamdi}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/data/stats.json"

echo "→ fetching profile, PR counts, top repos, latest PRs, events for $USER"

# Profile
PROFILE=$(curl -sf "https://api.github.com/users/$USER")

# Merged PR count (single search call, page 1, just need total_count)
MERGED_TOTAL=$(curl -sf "https://api.github.com/search/issues?q=author:$USER+is:pr+is:merged&per_page=1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_count', 0))")

# Top repos — sample up to 600 recent merged PRs across 6 pages.
# Unauthenticated search API allows only 10 req/min, so sleep generously
# between pages. Skip a page on failure rather than break the whole loop.
TMP=$(mktemp -d)
for p in 1 2 3 4 5 6; do
  if curl -s --retry 2 --retry-delay 4 "https://api.github.com/search/issues?q=author:$USER+is:pr+is:merged&per_page=100&page=$p&sort=updated" > "$TMP/p$p.json"; then
    # Validate page returned items, else discard
    if ! python3 -c "import sys,json; d=json.load(open('$TMP/p$p.json')); sys.exit(0 if d.get('items') else 1)" 2>/dev/null; then
      echo "  page $p empty or rate-limited — skipping"
      rm -f "$TMP/p$p.json"
    else
      COUNT=$(python3 -c "import json; print(len(json.load(open('$TMP/p$p.json')).get('items',[])))")
      echo "  page $p: $COUNT PRs"
    fi
  fi
  sleep 7
done

# Public events (last 90 days, max 300 events)
EVENTS=$(curl -sf "https://api.github.com/users/$USER/events/public?per_page=100")

python3 << PYEOF
import json, glob, datetime, sys
from collections import Counter, defaultdict

profile = json.loads('''$(echo "$PROFILE" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)))")''')
events  = json.loads('''$(echo "$EVENTS"  | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)))")''')

# Aggregate PRs across pages
repos = Counter()
latest = []
seen_urls = set()
for f in sorted(glob.glob('$TMP/p*.json')):
    d = json.load(open(f))
    for i in d.get('items', []):
        url = i.get('repository_url','')
        slug = url.replace('https://api.github.com/repos/', '') if url else ''
        if slug:
            repos[slug] += 1
        # Latest PRs — only external repos, not own
        if i.get('html_url') and i['html_url'] not in seen_urls and not slug.startswith('$USER/'):
            seen_urls.add(i['html_url'])
            latest.append({
                'repo': slug,
                'title': i.get('title','')[:120],
                'url': i.get('html_url',''),
                'mergedAt': i.get('closed_at') or i.get('updated_at')
            })

# Top external repos (exclude own)
external = [(s, n) for s, n in repos.most_common(50) if not s.startswith('$USER/')]
top_repos = []
for slug, count in external[:10]:
    top_repos.append({
        'slug': slug,
        'prs': count,
        'url': f'https://github.com/{slug}/pulls?q=is%3Apr+author%3A$USER+is%3Amerged'
    })

# Build heatmap from events — last 60 cells, ordered oldest→newest
today = datetime.date.today()
buckets = defaultdict(int)
for e in events:
    created = e.get('created_at', '')
    if not created: continue
    try:
        d = datetime.datetime.fromisoformat(created.replace('Z','+00:00')).date()
        buckets[d] += 1
    except: pass

heatmap = []
for offset in range(59, -1, -1):
    day = today - datetime.timedelta(days=offset)
    heatmap.append({'date': day.isoformat(), 'count': buckets.get(day, 0)})

out = {
    'lastUpdated': datetime.datetime.utcnow().isoformat() + 'Z',
    'user': profile.get('login'),
    'summary': {
        'mergedPRs': $MERGED_TOTAL,
        'publicRepos': profile.get('public_repos', 0),
        'followers': profile.get('followers', 0),
        'externalProjects': len(external)
    },
    'topRepos': top_repos,
    'latestPRs': latest[:5],
    'heatmap': heatmap
}

with open('$OUT', 'w') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f"✓ wrote {len(top_repos)} top repos, {len(latest[:5])} latest PRs, {len(heatmap)} heatmap cells")
print(f"  total merged: {$MERGED_TOTAL}, external projects: {len(external)}")
PYEOF

rm -rf "$TMP"
echo "→ wrote $OUT"

#!/usr/bin/env bash
# Lighthouse desktop + mobile against a URL; JSON and a one-line score summary into docs/evidence/lighthouse/.
#   bash tools/lighthouse.sh https://natebutlerexplains.github.io/3hue-experience/
set -eu
url="${1:-https://natebutlerexplains.github.io/3hue-experience/}"
out="docs/evidence/lighthouse"; mkdir -p "$out"
for preset in desktop mobile; do
  extra=""; [ "$preset" = desktop ] && extra="--preset=desktop"
  npx lighthouse "$url" --quiet --chrome-flags="--headless=new" $extra --output=json --output-path="$out/$preset.json" >/dev/null 2>&1 || true
  node -e "const r=require('./$out/$preset.json');const c=r.categories;const a=r.audits;console.log('$preset',{performance:c.performance.score,accessibility:c.accessibility.score,bestPractices:c['best-practices'].score,seo:c.seo.score,cls:a['cumulative-layout-shift'].numericValue,lcp:a['largest-contentful-paint'].displayValue})"
done

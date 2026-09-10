#!/usr/bin/env bash
# Crawler preview check (P5-D03/D05/D06): fetch the root and every share stub as the four link
# unfurlers and confirm the tags they read, the card, robots.txt and the icons.
#   bash tools/bots.sh https://natebutlerexplains.github.io/3hue-experience/
set -u
base="${1:-https://natebutlerexplains.github.io/3hue-experience/}"; base="${base%/}/"
fail=0
tag() { grep -o "<meta[^>]*$1[^>]*>" | head -1 | sed -E 's/.*content="([^"]*)".*/\1/'; }
for ua in "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)" "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)" "Twitterbot/1.0" "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"; do
  for p in "" s/lobby.html s/win-trust.html s/gain-control.html s/stay-ready.html s/path.html; do
    html=$(curl -s -A "$ua" "$base$p"); code=$(curl -s -o /dev/null -w '%{http_code}' -A "$ua" "$base$p")
    t=$(printf '%s' "$html" | tag 'property="og:title"'); u=$(printf '%s' "$html" | tag 'property="og:url"'); i=$(printf '%s' "$html" | tag 'property="og:image"'); c=$(printf '%s' "$html" | tag 'name="twitter:card"')
    refresh=$(printf '%s' "$html" | grep -ci 'http-equiv="refresh"')
    printf '%-14s %-22s %s | %s | %s | %s | refresh=%s\n' "${ua%% *}" "${p:-/}" "$code" "$t" "$c" "$u" "$refresh"
    [ "$code" = 200 ] && [ -n "$t" ] && [ -n "$i" ] && [ "$c" = summary_large_image ] && [ "$refresh" = 0 ] || fail=1
  done
done
echo "--- cards"
for id in lobby win-trust gain-control stay-ready path; do
  f=$(mktemp); code=$(curl -s -o "$f" -w '%{http_code}' "${base}media/share/$id.jpg"); dim=$(ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$f" 2>/dev/null); sz=$(stat -f %z "$f"); rm -f "$f"
  printf '%-14s %s %s %s bytes\n' "$id.jpg" "$code" "$dim" "$sz"; [ "$code" = 200 ] && [ "$dim" = "1200,630" ] && [ "$sz" -lt 307200 ] || fail=1
done
echo "--- robots and icons"
r=$(curl -s "${base}robots.txt"); printf 'robots.txt: %s | Disallow lines: %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "${base}robots.txt")" "$(printf '%s' "$r" | grep -ci '^disallow: */')"
for i in media/brand/favicon-32.png media/brand/apple-touch-icon-180.png; do printf '%s -> %s\n' "$i" "$(curl -s -o /dev/null -w '%{http_code}' "$base$i")"; done
[ "$fail" = 0 ] && echo "BOTS: PASS" || { echo "BOTS: FAIL"; exit 1; }

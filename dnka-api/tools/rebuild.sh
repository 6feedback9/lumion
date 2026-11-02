#!/bin/bash
# Re-creates the full dnka.pages.dev file set in /vercel/dep (Pages deploys
# replace everything, so a deploy must always carry every file).
# Needs CLOUDFLARE_API_TOKEN (to list the pictures referenced in D1).
# Usage: REV=<git sha> bash rebuild.sh
set -e
REV=${REV:-claude/funny-heisenberg-8tear4}
R=https://raw.githubusercontent.com/6feedback9/lumion/$REV/dnka-api
A=2fb0932700321b87ac2a99a542bfe343
D=18d14016-38d4-4a6b-b4fa-239de52f1209
mkdir -p /vercel/api /vercel/dep /vercel/prev
cd /vercel/api
for f in admin-v2.css admin-v2.js; do curl -sf -o $f $R/$f; done
q() { curl -s -X POST https://api.cloudflare.com/client/v4/accounts/$A/d1/database/$D/query \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' -d "{\"sql\":\"$1\"}"; }
q "select image_url, image_url_mobile from banners union all select photo, null from instructors" > /vercel/urls.json
q "select * from banners order by position" | python3 -c "
import json,sys
r=json.load(sys.stdin)['result'][0]['results']
for x in r:
  for c in ['active','active_en','active_uk','archived']: x[c]=bool(x[c])
json.dump(r,open('/vercel/banners.mock.json','w'))"
cd /vercel/dep
for f in favicon.ico favicon-32.png favicon-192.png favicon-512.png apple-touch-icon.png \
  embed/main.js embed/style.css embed/instructors.js embed/instructors.css \
  native-enhancer/main.js native-enhancer/style.css native-enhancer/partnership-fix.js native-enhancer/partnership-fix.css \
  partners/main.js partnership/main.js partnership/style.css \
  fallback/banners_pl.json fallback/banners_en.json fallback/banners_uk.json fallback/instructors.json \
  fallback/instructors_pl.json fallback/partners.json fallback/settings_partnership_uk.json fallback/settings_footer_tiktok.json; do
  mkdir -p $(dirname $f); curl -sf -o $f https://dnka.pages.dev/$f
done
curl -sf -o index.html https://dnka.pages.dev/
cat fallback/*.json embed/style.css /vercel/urls.json | grep -oE 'https://dnka\.pages\.dev/[^"'"'"' )]+' \
  | sed 's#https://dnka.pages.dev/##' | grep -v '\.js$\|\.css$' | sort -u > /tmp/assets.txt
while read f; do mkdir -p "$(dirname "$f")"; curl -sf -o "$f" "https://dnka.pages.dev/$f"; done < /tmp/assets.txt
printf '/*\n  Access-Control-Allow-Origin: *\n' > _headers
cp index.html _headers /vercel/prev/
echo "files $(find . -type f | wc -l) assets $(wc -l < /tmp/assets.txt)"

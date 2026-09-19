#!/bin/sh
set -eu
STAMP="$(date +%Y%m%d-%H%M%S)"
REL="/out/releases/$STAMP"

mkdir -p "$REL" /out/current
cp -a /usr/share/nginx/html/. "$REL/"
chmod -R a+rX "$REL"

rm -rf /out/current/* /out/current/.[!.]* 2>/dev/null || true
cp -a "$REL/." /out/current/
chmod -R a+rX /out/current

# keep the 5 most recent releases
ls -1dt /out/releases/*/ 2>/dev/null | tail -n +6 | while read -r d; do rm -rf "$d"; done

echo "published $STAMP -> /out/current"
exec nginx -g 'daemon off;'
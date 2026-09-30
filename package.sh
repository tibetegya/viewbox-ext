#!/bin/sh
# Zips this folder into viewbox-ext-<version>.zip for the Chrome Web Store or "Load unpacked" after unzipping.
set -e
cd "$(dirname "$0")"
v=$(node -p "require('./manifest.json').version")
rm -f "viewbox-ext-$v.zip"
zip -qr "viewbox-ext-$v.zip" . -x '*.test.mjs' '*.md' package.sh '.*'
echo "viewbox-ext-$v.zip"

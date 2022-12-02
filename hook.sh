#!/bin/bash

target=wordle
cd /srv/www/typable.dev/$target

git --git-dir=../$target/.git --work-tree=../$target pull origin main

mkdir -p dist

/home/andreas/.deno/bin/deno bundle app/main.ts dist/bundle.js --config deno.json
/usr/local/bin/sass assets/styles/style.scss dist/style.css --no-source-map

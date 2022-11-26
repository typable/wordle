#!/bin/bash

mkdir -p dist

deno bundle app/main.ts dist/bundle.js --config deno.json
sass assets/styles/style.scss dist/style.css --no-source-map

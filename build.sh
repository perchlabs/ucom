#!/usr/bin/env bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null 2>&1 && pwd )"
SRC_DIR="$ROOT_DIR/src"
OUT_DIR="$ROOT_DIR/dist"

for name in "$@"; do
  ENTRY="ucom_$name.ts"
  esbuild --format=esm --out-extension:.js=.js --minify --bundle "$SRC_DIR/$ENTRY" --outdir="$OUT_DIR"
#  esbuild --format=esm --out-extension:.js=.js --bundle "$SRC_DIR/$ENTRY" --outdir="$OUT_DIR"
done

#!/usr/bin/env bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null 2>&1 && pwd )"
SRC_DIR="$ROOT_DIR/src"
OUT_DIR="$ROOT_DIR/dist"

UTIL="$1"

if [ "$#" -eq 0 ]; then
  echo "You must choose a build utility '$UTIL'." >&2
  exit 1
fi
if [ "$#" -eq 1 ]; then
  echo "You must choose a entry name." >&2
  exit 1
fi

for name in "${@:2}"; do
  INPUT="$name.ts"
  ENTRY="$SRC_DIR/$INPUT"

  if [ ! -f "$ENTRY" ]; then
    echo "Entry file '$ENTRY' does not exist."
    exit 1
  fi

  case "$UTIL" in
  esbuild)
    esbuild --format=esm --out-extension:.js=.js --minify --bundle \
      --outdir="$OUT_DIR" "$ENTRY"
  ;;
  bun)
    bun build --production --outdir="$OUT_DIR" "$ENTRY"
  ;;
  *)
    echo "Unknown build utility." >&2
    exit 1
  ;;
  esac
done

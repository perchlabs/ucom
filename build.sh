#!/usr/bin/env bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null 2>&1 && pwd )"
SRC_DIR="$ROOT_DIR/src"
DST_DIR="$ROOT_DIR/dist"

[[ $* == *--dev* ]] && DEV_MODE=1

TOOL="${TOOL:-esbuild}"
PORT="${PORT:-8000}"

SRC_FILE="$SRC_DIR/ucom.ts"
DST_FILE="$DST_DIR/ucom.js"
cd "$DST_DIR"

if [ ! -f "$SRC_FILE" ]; then
  echo "SRC_FILE file '$SRC_FILE' does not exist."
  exit 1
fi

if [[ -n "$DEV_MODE" ]]; then
  declare -A list=(
    [busybox]="busybox httpd -f -p ${PORT}"
    [caddy]="file-server --listen :${PORT} --browse"
    [python3]="python3 -m http.server ${PORT}"
    [php]="php -S 0.0.0.0:${PORT}"
    [ruby]="ruby -run -ehttpd . -p${PORT}"
  )
  for cmd in "${!list[@]}"; do
    if command -v "$cmd" > /dev/null 2>&1; then
      HTTPD="${list[$cmd]}"
      break
    fi
  done
  if [[ -z "$HTTPD" ]]; then
    echo "Unable to find utility to host content." >&2
    exit 1
  fi

  echo "Hosting content on port $PORT"
  bash -c "$HTTPD > /dev/null 2>&1" &
  HTTPD_PID=$!
  trap "kill $HTTPD_PID 2>/dev/null" EXIT
fi

case "$TOOL" in
esbuild)
  BUILDER="esbuild \"$SRC_FILE\" --outfile=\"$DST_FILE\" --format=esm --bundle"
  if [[ -n "$DEV_MODE" ]]; then
    BUILDER="$BUILDER --watch"
  else
    BUILDER="$BUILDER --minify"
  fi
;;
bun)
  BUILDER="bun build \"$SRC_FILE\" --outfile=\"$DST_FILE\""
  if [[ -n "$DEV_MODE" ]]; then
    BUILDER="$BUILDER --watch"
  else
    BUILDER="$BUILDER --production"
  fi
;;
*)
  echo "Unknown build utility." >&2
  exit 1
;;
esac

# Run Builder utility
bash -c "$BUILDER"

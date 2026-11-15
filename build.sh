#!/usr/bin/env bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" > /dev/null 2>&1 && pwd )"
SRC_DIR="$ROOT_DIR/src"
DST_DIR="$ROOT_DIR/dist"

DEV_MODE=
[[ $* == *--dev* ]] && DEV_MODE=1

TOOL="${TOOL:-esbuild}"

SRC_FILE="$SRC_DIR/ucom.ts"
DST_FILE="$DST_DIR/ucom.js"
cd "$DST_DIR"

if [ ! -f "$SRC_FILE" ]; then
  echo "SRC_FILE file '$SRC_FILE' does not exist."
  exit 1
fi

if [[ -n "$DEV_MODE" ]]; then
  LIST="busybox caddy php python3 ruby"
  CMD=""
  for cmd in $LIST; do
    if command -v "$cmd" > /dev/null 2>&1; then
      CMD="$cmd"
      break
    fi
  done

  case "$CMD" in
  busybox)
    busybox httpd -f -p 8000 &
  ;;
  caddy)
    caddy file-server --listen :8000 --browse &
  ;;
  python3)
    python3 -m http.server 8000 &
  ;;
  php)
    php -S 0.0.0.0:8000 &
  ;;
  ruby)
    ruby -run -ehttpd . -p8000 &
  ;;
  *)
    echo "Unable to find utility to host content." >&2
    exit 1
  ;;
  esac
fi
WEBSERVER_PID=$!
trap "kill $WEBSERVER_PID 2>/dev/null" EXIT

case "$TOOL" in
esbuild)
  if [[ -n "$DEV_MODE" ]]; then
    esbuild "$SRC_FILE" --format=esm --bundle --watch --outfile="$DST_FILE"
  else
    esbuild "$SRC_FILE" --format=esm --bundle --minify --outfile="$DST_FILE"
  fi
;;
bun)
  if [[ -n "$DEV_MODE" ]]; then
    bun build "$SRC_FILE" --watch --outfile="$DST_FILE"
  else
    bun build "$SRC_FILE" --production --outfile="$DST_FILE"
  fi
;;
*)
  echo "Unknown build utility." >&2
  exit 1
;;
esac

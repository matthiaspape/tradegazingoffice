#!/bin/zsh
set -eu
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  desk_node="$(command -v node)"
else
  desk_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$desk_node" ]; then
  echo "Bitte Node.js 24 oder neuer installieren."
  read -r '?Enter zum Schließen.'
  exit 1
fi
"$desk_node" ops/launch.mjs
/usr/bin/open 'http://127.0.0.1:43120/'

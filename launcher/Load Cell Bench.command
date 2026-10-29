#!/bin/sh
# Mac double-click launcher. Terminal stays open behind the small window.
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$DIR/.."
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$DIR/bench_launcher.py"
fi
exec python "$DIR/bench_launcher.py"

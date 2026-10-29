#!/bin/sh
# Freeze a LoadCellBench binary next to this script. Run it on the target OS.
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$DIR"
python3 -m venv "$DIR/.pyinstaller/venv"
# shellcheck disable=SC1091
. "$DIR/.pyinstaller/venv/bin/activate"
python -m pip install --upgrade pip pyinstaller
python -m PyInstaller \
  --noconfirm \
  --clean \
  --onefile \
  --windowed \
  --name LoadCellBench \
  --distpath "$DIR" \
  --workpath "$DIR/.pyinstaller/work" \
  --specpath "$DIR/.pyinstaller" \
  "$DIR/bench_launcher.py"

# Freeze launcher\LoadCellBench.exe on Windows.
$ErrorActionPreference = "Stop"
$launcher = $PSScriptRoot
$venv = Join-Path $launcher ".pyinstaller\venv"
$python = Join-Path $venv "Scripts\python.exe"
if (-not (Test-Path $python)) {
    py -3 -m venv $venv
}
& $python -m pip install --upgrade pip pyinstaller
& $python -m PyInstaller `
    --noconfirm `
    --clean `
    --onefile `
    --windowed `
    --name LoadCellBench `
    --distpath $launcher `
    --workpath (Join-Path $launcher ".pyinstaller\work") `
    --specpath (Join-Path $launcher ".pyinstaller") `
    (Join-Path $launcher "bench_launcher.py")

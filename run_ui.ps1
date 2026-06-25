# run_ui.ps1  (Windows replacement for: flask --app ui/app run --port 5001)
# Starts the Flask web UI. Open http://127.0.0.1:5001 in your browser.

$ProjectRoot = $PSScriptRoot
$Py = Join-Path $ProjectRoot "venv\Scripts\python.exe"

if (-not (Test-Path $Py)) {
    Write-Host "ERROR: virtual environment not found at venv\Scripts\python.exe" -ForegroundColor Red
    exit 1
}

$env:FLASK_APP = "ui/app.py"
Write-Host "Starting Web UI -> http://127.0.0.1:5001" -ForegroundColor Green
& $Py -m flask --app ui/app run --port 5001

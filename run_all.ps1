# run_all.ps1
# ONE command to launch the whole system:
#   - Data Loader API   (8001)
#   - Representation API (8002)
#   - Search API        (8003)
#   - Web UI (Flask)    (5001)  + opens the browser
#
# NOTE: Start MySQL yourself first from the XAMPP Control Panel (the database
#       lives there). This script only checks it and warns if it's not running.

$ProjectRoot = $PSScriptRoot
$Py = Join-Path $ProjectRoot "venv\Scripts\python.exe"

if (-not (Test-Path $Py)) {
    Write-Host "ERROR: virtual environment not found at venv\Scripts\python.exe" -ForegroundColor Red
    Write-Host "Create it first:  python -m venv venv   then   venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# --- Friendly check: is MySQL (XAMPP) running on port 3306? ---
$mysqlUp = $false
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect("127.0.0.1", 3306)
    $mysqlUp = $client.Connected
    $client.Close()
} catch { }

if ($mysqlUp) {
    Write-Host "MySQL is running (port 3306). Good." -ForegroundColor Green
} else {
    Write-Host "WARNING: MySQL is NOT running on port 3306." -ForegroundColor Yellow
    Write-Host "         Open the XAMPP Control Panel and click Start next to MySQL," -ForegroundColor Yellow
    Write-Host "         otherwise searches will return no results." -ForegroundColor Yellow
}

# --- Helper to launch a FastAPI service in its own window ---
function Start-IRService($title, $module, $port) {
    Write-Host "Starting $title  ->  http://127.0.0.1:$port" -ForegroundColor Green
    Start-Process -FilePath $Py `
        -ArgumentList @("-m", "uvicorn", "${module}:app", "--host", "127.0.0.1", "--port", "$port") `
        -WorkingDirectory $ProjectRoot
}

Write-Host ""
Write-Host "Launching all backend services..." -ForegroundColor Cyan
Start-IRService "Data Loader API"     "api.data_loader_api"    8001
Start-IRService "Representation API"   "api.representation_api" 8002
Start-IRService "Search API"           "api.search_api"         8003

# --- Launch the web UI ---
Write-Host "Starting Web UI         ->  http://127.0.0.1:5001" -ForegroundColor Green
Start-Process -FilePath $Py `
    -ArgumentList @("-m", "flask", "--app", "ui/app", "run", "--port", "5001") `
    -WorkingDirectory $ProjectRoot

# --- Wait a moment for the UI to come up, then open the browser ---
Start-Sleep -Seconds 5
Start-Process "http://127.0.0.1:5001"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Everything launched. Browser opening at http://127.0.0.1:5001" -ForegroundColor Cyan
Write-Host " Each service runs in its own window. Close a window to stop it." -ForegroundColor Yellow
Write-Host " TIP: do one warm-up search first (the first one loads the models" -ForegroundColor Yellow
Write-Host "      and is slow ~30-60s; every search after that is fast)." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

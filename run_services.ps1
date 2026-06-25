# run_services.ps1  (Windows replacement for run_services.sh)
# Starts the 3 core SOA services, each in its own PowerShell window so you can
# watch the logs live. Close a window (or press Ctrl+C in it) to stop that service.

$ProjectRoot = $PSScriptRoot
$Py = Join-Path $ProjectRoot "venv\Scripts\python.exe"

if (-not (Test-Path $Py)) {
    Write-Host "ERROR: virtual environment not found at venv\Scripts\python.exe" -ForegroundColor Red
    Write-Host "Create it first:  python -m venv venv" -ForegroundColor Yellow
    exit 1
}

function Start-IRService($title, $module, $port) {
    Write-Host "Starting $title  ->  http://127.0.0.1:$port" -ForegroundColor Green
    Start-Process -FilePath $Py `
        -ArgumentList @("-m", "uvicorn", "${module}:app", "--host", "127.0.0.1", "--port", "$port") `
        -WorkingDirectory $ProjectRoot
}

Write-Host "Starting all core services..." -ForegroundColor Cyan
Start-IRService "Data Loader API"     "api.data_loader_api"    8001
Start-IRService "Representation API"   "api.representation_api" 8002
Start-IRService "Search API"           "api.search_api"         8003

Write-Host ""
Write-Host "All services launched in separate windows." -ForegroundColor Cyan
Write-Host "  Data Loader     : http://127.0.0.1:8001/docs"
Write-Host "  Representation  : http://127.0.0.1:8002/docs"
Write-Host "  Search          : http://127.0.0.1:8003/docs"
Write-Host ""
Write-Host "To stop a service, close its window or press Ctrl+C inside it." -ForegroundColor Yellow

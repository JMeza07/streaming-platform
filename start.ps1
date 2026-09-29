# Script PowerShell para iniciar la plataforma de streaming
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          🚀 STREAMING PLATFORM - INICIO DE SERVIDORES 🚀           " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Comprobar e iniciar Docker Compose
Write-Host "[1/3] Verificando Docker..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerInstalled) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      Iniciando contenedores (Evolution API & Postgres)..." -ForegroundColor Gray
        docker compose up -d
        if ($LASTEXITCODE -eq 0) {
            Write-Host "      [OK] Contenedores Docker iniciados correctamente." -ForegroundColor Green
        } else {
            Write-Host "      [!] Advertencia: docker compose devolvio un codigo de salida no cero." -ForegroundColor Yellow
        }
    } else {
        Write-Host "      [!] Docker Desktop no parece estar corriendo. Saltando Docker..." -ForegroundColor Yellow
    }
} else {
    Write-Host "      [!] Docker no encontrado en el sistema. Saltando Docker..." -ForegroundColor Yellow
}

Write-Host ""

# 2. Iniciar Backend
Write-Host "[2/3] Iniciando Backend (NestJS en puerto 3001)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$RootDir\backend`" && title Backend (NestJS :3001) && npm run dev"

# 3. Iniciar Frontend
Write-Host "[3/3] Iniciando Frontend (Next.js en puerto 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$RootDir\frontend`" && title Frontend (Next.js :3000) && npm run dev"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                     SERVICIOS EN EJECUCIÓN                           " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  * Frontend Web:       http://localhost:3000" -ForegroundColor White
Write-Host "  * Backend API:        http://localhost:3001/api" -ForegroundColor White
Write-Host "  * Evolution API (WA): http://localhost:8080" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host 'Para detener los servicios puedes ejecutar: .\stop.ps1 o stop.bat' -ForegroundColor Gray
Write-Host ""

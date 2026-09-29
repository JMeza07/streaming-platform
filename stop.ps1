# Script PowerShell para detener la plataforma de streaming
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host "          🛑 STREAMING PLATFORM - DETENER SERVIDORES 🛑             " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host ""

function Stop-PortProcess {
    param([int]$Port, [string]$ServiceName)
    Write-Host "Verificando puerto $Port ($ServiceName)..." -ForegroundColor Gray
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pidToKill = $conn.OwningProcess
            if ($pidToKill -gt 0) {
                Write-Host "  Deteniendo proceso PID $pidToKill en puerto $Port..." -ForegroundColor Red
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "  [OK] Puerto $Port no esta en uso." -ForegroundColor Green
    }
}

# 1. Detener Frontend y Backend por puerto
Stop-PortProcess -Port 3000 -ServiceName "Frontend Next.js"
Stop-PortProcess -Port 3001 -ServiceName "Backend NestJS"

# 2. Detener Docker Compose
Write-Host ""
Write-Host "Deteniendo contenedores Docker..." -ForegroundColor Gray
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    docker compose stop
    Write-Host "  [OK] Contenedores Docker pausados." -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "                   TODOS LOS SERVICIOS DETENIDOS                      " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""

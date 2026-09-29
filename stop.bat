@echo off
chcp 65001 >nul
title StreamControl Platform - Deteniendo Servidores...

echo ======================================================================
echo           🛑 STREAMING PLATFORM - DETENER SERVIDORES 🛑
echo ======================================================================
echo.

echo [1/3] Liberando puerto 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Deteniendo PID %%a en puerto 3000...
    taskkill /F /PID %%a >nul 2>nul
)

echo [2/3] Liberando puerto 3001 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo Deteniendo PID %%a en puerto 3001...
    taskkill /F /PID %%a >nul 2>nul
)

echo [3/3] Deteniendo contenedores Docker...
where docker >nul 2>nul
if %errorlevel% equ 0 (
    docker compose stop
    echo [+] Contenedores Docker pausados.
)

echo.
echo ======================================================================
echo                    SERVICIOS DETENIDOS
echo ======================================================================
echo.
pause

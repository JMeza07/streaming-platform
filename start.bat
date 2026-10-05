@echo off
chcp 65001 >nul
title MezaStreaming Platform - Iniciando Servidores...

echo ======================================================================
echo           🚀 STREAMING PLATFORM - INICIO DE SERVIDORES 🚀
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0"

:: 1. Iniciar Docker Compose (Evolution API & Postgres de WhatsApp)
echo [1/3] Verificando e iniciando contenedores Docker...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Docker no esta en el PATH o no esta instalado. Saltando Docker...
) else (
    docker info >nul 2>nul
    if %errorlevel% neq 0 (
        echo [!] Docker Desktop no esta ejecutandose. Saltando Docker...
    ) else (
        docker compose up -d
        if %errorlevel% equ 0 (
            echo [+] Contenedores Docker iniciados con exito.
        ) else (
            echo [!] Hubo un detalle al iniciar Docker Compose.
        )
    )
)
echo.

:: 2. Iniciar Backend (NestJS en puerto 3001)
echo [2/3] Iniciando Backend en puerto 3001...
start "Backend - NestJS (:3001)" cmd /k "cd /d "%ROOT_DIR%backend" && title Backend (NestJS :3001) && npm run dev"

:: 3. Iniciar Frontend (Next.js en puerto 3000)
echo [3/3] Iniciando Frontend en puerto 3000...
start "Frontend - Next.js (:3000)" cmd /k "cd /d "%ROOT_DIR%frontend" && title Frontend (Next.js :3000) && npm run dev"

echo.
echo ======================================================================
echo                      SERVICIOS EN EJECUCION
echo ======================================================================
echo   * Frontend Web:       http://localhost:3000
echo   * Backend API:        http://localhost:3001/api
echo   * Evolution API (WA): http://localhost:8080
echo   * Ollama IA Local:    http://localhost:11434
echo ======================================================================
echo Para detener los servicios puedes ejecutar: stop.bat
echo.
pause

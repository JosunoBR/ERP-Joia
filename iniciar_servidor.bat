@echo off
title Portal ERP Joia - Servidor Unificado

echo ================================================================
echo           PORTAL ERP JOIA - INICIALIZADOR DO SISTEMA
echo ================================================================
echo.

:: 1. Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao foi encontrado no seu computador!
    echo Por favor, baixe e instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: 2. Verificar dependencias do Backend
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo [1/4] Instalando pacotes do backend, aguarde...
    call npm install
)

:: 3. Verificar dependencias do Frontend Web
cd /d "%~dp0web"
if not exist "node_modules" (
    echo [2/4] Instalando pacotes do ERP web, aguarde...
    call npm install
)

:: 4. Verificar dependencias do Portal Backend
if exist "%~dp0portal-backend\package.json" (
    cd /d "%~dp0portal-backend"
    if not exist "node_modules" (
        echo [3/4] Instalando pacotes do Portal Backend, aguarde...
        call npm install
    )
)

:: 5. Iniciar tudo pelo runner
cd /d "%~dp0"
node runner.js

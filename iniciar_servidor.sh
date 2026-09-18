#!/usr/bin/env bash

# ================================================================
#           PORTAL ERP JÓIA - INICIALIZADOR DO SISTEMA (macOS/Linux)
# ================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# 1. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não foi encontrado!"
    echo "Por favor, instale o Node.js em: https://nodejs.org/ ou via Homebrew: brew install node"
    echo ""
    exit 1
fi

# 2. Verificar dependências do Backend
if [ ! -d "backend/node_modules" ]; then
    echo "[1/2] Instalando pacotes do backend, aguarde..."
    cd backend && npm install && cd ..
fi

# 3. Verificar dependências do Frontend Web
if [ ! -d "web/node_modules" ]; then
    echo "[2/2] Instalando pacotes do frontend, aguarde..."
    cd web && npm install && cd ..
fi

# 4. Iniciar tudo em uma única janela
echo "Iniciando servidores..."
node runner.js

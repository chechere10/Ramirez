#!/bin/bash
# ============================================
# ManifestoCross - Script para Detener Servicios
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Directorio base
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════╗"
echo "║     ManifestoCross - Deteniendo Servicios     ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# Detener Frontend
echo -e "${BLUE}[1/3] 🎨 Deteniendo Frontend...${NC}"
if [ -f ".frontend.pid" ]; then
    PID=$(cat .frontend.pid)
    kill $PID 2>/dev/null || true
    rm -f .frontend.pid
    echo -e "   ${GREEN}✅ Frontend detenido${NC}"
else
    pkill -f "vite" 2>/dev/null || true
    pkill -f "serve.*dist" 2>/dev/null || true
    echo -e "   ${YELLOW}⚠️  No se encontró PID, proceso terminado por nombre${NC}"
fi

# Detener Backend
echo -e "${BLUE}[2/3] ⚙️  Deteniendo Backend...${NC}"
if [ -f ".backend.pid" ]; then
    PID=$(cat .backend.pid)
    kill $PID 2>/dev/null || true
    rm -f .backend.pid
    echo -e "   ${GREEN}✅ Backend detenido${NC}"
else
    pkill -f "uvicorn" 2>/dev/null || true
    echo -e "   ${YELLOW}⚠️  No se encontró PID, proceso terminado por nombre${NC}"
fi

# Detener servicios Docker
echo -e "${BLUE}[3/3] 🐳 Deteniendo servicios Docker...${NC}"
docker compose --profile dev --profile prod down --remove-orphans
echo -e "   ${GREEN}✅ Contenedores detenidos${NC}"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Todos los servicios detenidos          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""

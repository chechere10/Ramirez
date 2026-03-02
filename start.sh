#!/bin/bash
# ============================================
# ManifestoCross - Script de Inicio Completo
# ============================================
# Este script inicia todos los servicios necesarios
# para que la aplicación funcione correctamente.
# 
# Uso: ./start.sh [dev|prod]
#   dev  - Modo desarrollo (default)
#   prod - Modo producción
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Directorio base del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Modo por defecto
MODE=${1:-dev}

# Banner
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   ███╗   ███╗ █████╗ ███╗   ██╗██╗███████╗███████╗███████╗║"
echo "║   ████╗ ████║██╔══██╗████╗  ██║██║██╔════╝██╔════╝██╔════╝║"
echo "║   ██╔████╔██║███████║██╔██╗ ██║██║█████╗  █████╗  ███████╗║"
echo "║   ██║╚██╔╝██║██╔══██║██║╚██╗██║██║██╔══╝  ██╔══╝  ╚════██║║"
echo "║   ██║ ╚═╝ ██║██║  ██║██║ ╚████║██║██║     ███████╗███████║║"
echo "║   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚══════╝╚══════╝║"
echo "║                      CROSS                               ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BOLD}${BLUE}🚀 Iniciando ManifestoCross en modo: ${YELLOW}${MODE}${NC}\n"

# Función para esperar que un servicio esté listo
wait_for_service() {
    local name=$1
    local check_cmd=$2
    local max_attempts=${3:-30}
    local attempt=1

    echo -ne "   ${YELLOW}⏳ Esperando ${name}...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$check_cmd" > /dev/null 2>&1; then
            echo -e "\r   ${GREEN}✅ ${name} listo!${NC}                    "
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "\r   ${RED}❌ ${name} no respondió después de $max_attempts intentos${NC}"
    return 1
}

# ============================================
# PASO 1: Detener servicios anteriores
# ============================================
echo -e "${BOLD}${BLUE}[1/5] 🧹 Limpiando servicios anteriores...${NC}"
docker compose --profile dev --profile prod down --remove-orphans 2>/dev/null || true
echo -e "   ${GREEN}✅ Limpieza completada${NC}\n"

# ============================================
# PASO 2: Iniciar servicios de infraestructura
# ============================================
echo -e "${BOLD}${BLUE}[2/5] 🐳 Iniciando servicios de infraestructura...${NC}"
docker compose up -d postgres elasticsearch minio redis

# Esperar a que cada servicio esté listo
echo ""
wait_for_service "PostgreSQL" "docker exec manifestocross-postgres pg_isready -U postgres" 30
wait_for_service "Elasticsearch" "curl -sf http://localhost:9201/_cluster/health" 60
wait_for_service "MinIO" "curl -sf http://localhost:9020/minio/health/live" 30
wait_for_service "Redis" "docker exec manifestocross-redis redis-cli ping" 30
echo ""

# ============================================
# PASO 3: Configurar MinIO (bucket)
# ============================================
echo -e "${BOLD}${BLUE}[3/5] 📦 Configurando almacenamiento MinIO...${NC}"
if command -v mc &> /dev/null; then
    mc alias set myminio http://localhost:9020 minioadmin minioadmin 2>/dev/null || true
    mc mb myminio/manifestocross --ignore-existing 2>/dev/null || true
    echo -e "   ${GREEN}✅ Bucket 'manifestocross' configurado${NC}\n"
else
    echo -e "   ${YELLOW}⚠️  Cliente 'mc' no instalado, omitiendo configuración del bucket${NC}"
    echo -e "   ${YELLOW}   Puedes configurarlo manualmente en http://localhost:9021${NC}\n"
fi

# ============================================
# PASO 4: Iniciar Backend y Frontend con Docker
# ============================================
echo -e "${BOLD}${BLUE}[4/5] 🚀 Iniciando Backend y Frontend...${NC}"

if [ "$MODE" == "prod" ]; then
    echo -e "   ${CYAN}📦 Modo producción - construyendo y desplegando...${NC}"
    docker compose --profile prod up -d --build
    FRONTEND_URL="http://localhost:80"
else
    echo -e "   ${CYAN}🔥 Modo desarrollo - iniciando servidores de desarrollo...${NC}"
    docker compose --profile dev up -d --build
    FRONTEND_URL="http://localhost:3005"
fi

echo ""
wait_for_service "Backend API" "curl -sf http://localhost:8005/health" 60
wait_for_service "Frontend" "curl -sf $FRONTEND_URL" 60
echo ""

# ============================================
# PASO 5: Resumen final
# ============================================
echo -e "${BOLD}${BLUE}[5/5] 📋 Resumen de servicios${NC}\n"

if [ "$MODE" == "prod" ]; then
    FRONTEND_PORT="80"
else
    FRONTEND_PORT="3005"
fi

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}✅ TODOS LOS SERVICIOS INICIADOS CORRECTAMENTE${NC}            ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}🌐 ACCESOS:${NC}                                               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ Frontend:      ${CYAN}http://localhost:${FRONTEND_PORT}${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ Backend API:   ${CYAN}http://localhost:8005${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  └─ API Docs:      ${CYAN}http://localhost:8005/docs${NC}              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}🔧 SERVICIOS DE INFRAESTRUCTURA:${NC}                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ PostgreSQL:    ${CYAN}localhost:5435${NC}                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ Elasticsearch: ${CYAN}localhost:9201${NC}                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ MinIO API:     ${CYAN}localhost:9020${NC}                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ MinIO Console: ${CYAN}http://localhost:9021${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  └─ Redis:         ${CYAN}localhost:6382${NC}                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}📁 LOGS:${NC}                                                  ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ Backend:       ${YELLOW}docker logs manifestocross-backend${NC}     ${GREEN}║${NC}"
if [ "$MODE" == "prod" ]; then
echo -e "${GREEN}║${NC}  └─ Frontend:      ${YELLOW}docker logs manifestocross-frontend-prod${NC}${GREEN}║${NC}"
else
echo -e "${GREEN}║${NC}  └─ Frontend:      ${YELLOW}docker logs manifestocross-frontend-dev${NC} ${GREEN}║${NC}"
fi
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}⚡ COMANDOS ÚTILES:${NC}                                       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ Detener todo:  ${YELLOW}./stop.sh${NC}                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ├─ Ver logs:      ${YELLOW}docker compose logs -f${NC}                 ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  └─ Estado Docker: ${YELLOW}docker compose ps${NC}                      ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}${GREEN}🎉 ¡ManifestoCross está listo! Abre ${CYAN}http://localhost:${FRONTEND_PORT}${GREEN} en tu navegador${NC}"
echo ""

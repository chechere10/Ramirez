#!/bin/bash
# ===========================================
# ManifestoCross - Script de Deployment
# Despliega en DigitalOcean con SSL automático
# ===========================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuración
DOMAIN=${DOMAIN:-"zeroset.me"}
EMAIL=${SSL_EMAIL:-"admin@zeroset.me"}
SERVER_IP="209.38.97.204"
SERVER_USER="root"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          ManifestoCross - Deployment a Producción             ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Dominio: $DOMAIN"
echo "║  Servidor: $SERVER_IP"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No existe .env - creando desde .env.example${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Edita .env con tus valores antes de continuar${NC}"
    exit 1
fi

# Cargar variables
source .env

echo -e "${YELLOW}📦 Paso 1: Preparando archivos...${NC}"

# Crear directorio temporal para deploy
DEPLOY_DIR=$(mktemp -d)
echo "   Directorio temporal: $DEPLOY_DIR"

# Copiar archivos necesarios
cp -r backend frontend nginx docker-compose.prod.yml .env "$DEPLOY_DIR/"
cp scripts/setup-server.sh "$DEPLOY_DIR/"

echo -e "${GREEN}✅ Archivos preparados${NC}"

echo -e "${YELLOW}📤 Paso 2: Subiendo al servidor...${NC}"

# Crear directorio en servidor
ssh $SERVER_USER@$SERVER_IP "mkdir -p /opt/manifestocross"

# Subir archivos
rsync -avz --progress "$DEPLOY_DIR/" $SERVER_USER@$SERVER_IP:/opt/manifestocross/

echo -e "${GREEN}✅ Archivos subidos${NC}"

echo -e "${YELLOW}🔧 Paso 3: Configurando servidor...${NC}"

# Ejecutar setup en el servidor
ssh $SERVER_USER@$SERVER_IP "cd /opt/manifestocross && chmod +x setup-server.sh && ./setup-server.sh"

echo -e "${GREEN}✅ Servidor configurado${NC}"

echo -e "${YELLOW}🔐 Paso 4: Configurando SSL...${NC}"

# Obtener certificado SSL
ssh $SERVER_USER@$SERVER_IP "cd /opt/manifestocross && ./setup-ssl.sh $DOMAIN $EMAIL"

echo -e "${GREEN}✅ SSL configurado${NC}"

echo -e "${YELLOW}🚀 Paso 5: Iniciando servicios...${NC}"

# Iniciar Docker Compose
ssh $SERVER_USER@$SERVER_IP "cd /opt/manifestocross && docker compose -f docker-compose.prod.yml up -d"

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ ¡DEPLOYMENT EXITOSO!                    ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  🌐 Tu aplicación está disponible en:                         ║"
echo "║     https://$DOMAIN                                    ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Limpiar
rm -rf "$DEPLOY_DIR"

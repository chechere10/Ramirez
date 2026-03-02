#!/bin/bash
# ===========================================
# ManifestoCross - Script de Túneles ngrok
# Expone frontend y backend para acceso remoto
# ===========================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Puertos
FRONTEND_PORT=${1:-3007}
BACKEND_PORT=${2:-8005}

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           ManifestoCross - ngrok Tunnels              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar que ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok no está instalado${NC}"
    echo "   Instálalo con: sudo snap install ngrok"
    exit 1
fi

# Matar túneles anteriores
echo -e "${YELLOW}🧹 Limpiando túneles anteriores...${NC}"
pkill -f "ngrok" 2>/dev/null
sleep 2

# Crear directorio temporal para logs
TEMP_DIR=$(mktemp -d)
FRONTEND_LOG="$TEMP_DIR/frontend.log"
BACKEND_LOG="$TEMP_DIR/backend.log"

# Iniciar túnel del frontend
echo -e "${CYAN}🚀 Iniciando túnel del frontend (puerto $FRONTEND_PORT)...${NC}"
ngrok http $FRONTEND_PORT --log=stdout > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
sleep 3

# Iniciar túnel del backend
echo -e "${CYAN}🚀 Iniciando túnel del backend (puerto $BACKEND_PORT)...${NC}"
ngrok http $BACKEND_PORT --log=stdout > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
sleep 3

# Obtener URLs de los túneles usando la API de ngrok
echo -e "${YELLOW}📡 Obteniendo URLs de los túneles...${NC}"
sleep 2

# Función para obtener URL del túnel
get_tunnel_url() {
    local port=$1
    curl -s http://localhost:4040/api/tunnels 2>/dev/null | \
        grep -oP '"public_url":"https://[^"]+' | \
        grep -oP 'https://[^"]+' | \
        head -1
}

# Intentar obtener URLs múltiples veces
FRONTEND_URL=""
BACKEND_URL=""

for i in {1..10}; do
    TUNNELS=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)
    
    if [ -n "$TUNNELS" ]; then
        # Obtener las URLs
        URLS=$(echo "$TUNNELS" | grep -oP '"public_url":"https://[^"]+' | grep -oP 'https://[^"]+')
        
        # La primera será frontend (3007), la segunda backend (8005)
        FRONTEND_URL=$(echo "$URLS" | head -1)
        BACKEND_URL=$(echo "$URLS" | tail -1)
        
        if [ -n "$FRONTEND_URL" ] && [ -n "$BACKEND_URL" ]; then
            break
        fi
    fi
    
    echo -e "${YELLOW}   Esperando túneles... ($i/10)${NC}"
    sleep 2
done

# Verificar que tenemos las URLs
if [ -z "$FRONTEND_URL" ] || [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ Error obteniendo URLs de ngrok${NC}"
    echo "   Revisa que ngrok esté configurado correctamente"
    echo "   Ejecuta: ngrok config add-authtoken <tu-token>"
    
    # Limpieza
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Mostrar información
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ¡Túneles activos!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}📱 FRONTEND (comparte este link):${NC}"
echo -e "${YELLOW}   $FRONTEND_URL${NC}"
echo ""
echo -e "${PURPLE}🔧 BACKEND (para configurar sync):${NC}"
echo -e "${YELLOW}   $BACKEND_URL${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📋 Instrucciones para tu amigo:${NC}"
echo -e "   1. Abre el link del FRONTEND en el celular"
echo -e "   2. Click en el icono de nube ☁️ (arriba derecha)"
echo -e "   3. Click en 'Configurar servidor'"
echo -e "   4. Pega la URL del BACKEND: ${YELLOW}$BACKEND_URL${NC}"
echo -e "   5. Click 'Guardar y Conectar'"
echo -e "   6. Click 'Descargar de la nube' para sincronizar"
echo ""
echo -e "${RED}⚠️  Presiona Ctrl+C para detener los túneles${NC}"
echo ""

# Copiar URL al portapapeles si xclip está disponible
if command -v xclip &> /dev/null; then
    echo "$FRONTEND_URL" | xclip -selection clipboard
    echo -e "${GREEN}📋 URL del frontend copiada al portapapeles${NC}"
fi

# Guardar URLs para referencia
echo "FRONTEND_URL=$FRONTEND_URL" > "$TEMP_DIR/urls.txt"
echo "BACKEND_URL=$BACKEND_URL" >> "$TEMP_DIR/urls.txt"

# Mantener el script corriendo y mostrar logs
echo -e "${CYAN}📊 Panel de ngrok: http://localhost:4040${NC}"
echo ""

# Esperar a que el usuario presione Ctrl+C
trap cleanup INT

cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo túneles...${NC}"
    pkill -f "ngrok"
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}✅ Túneles cerrados${NC}"
    exit 0
}

# Mantener el script activo
while true; do
    sleep 60
    # Verificar que los túneles siguen activos
    if ! pgrep -f "ngrok" > /dev/null; then
        echo -e "${RED}❌ Los túneles se han cerrado${NC}"
        cleanup
    fi
done

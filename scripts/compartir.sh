#!/bin/bash
# ===========================================
# ManifestoCross - Compartir con ngrok
# Solo necesita 1 túnel - Vite hace proxy del backend
# ===========================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Puerto del frontend (Vite)
FRONTEND_PORT=${1:-3007}

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║        ManifestoCross - Compartir Sistema             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar ngrok
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok no está instalado${NC}"
    echo "   Instálalo con: sudo snap install ngrok"
    exit 1
fi

# Verificar que Vite está corriendo
if ! curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  El frontend no está corriendo en el puerto $FRONTEND_PORT${NC}"
    echo -e "${CYAN}   Iniciando servidor de desarrollo...${NC}"
    
    cd "$(dirname "$0")/../frontend"
    npm run dev -- --host --port $FRONTEND_PORT &
    DEV_PID=$!
    
    echo -e "${YELLOW}   Esperando a que el servidor inicie...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ Servidor iniciado${NC}"
            break
        fi
        sleep 1
    done
fi

# Verificar que el backend está corriendo
if ! curl -s http://localhost:8005/docs > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  El backend no está corriendo${NC}"
    echo -e "${CYAN}   Asegúrate de iniciar el backend con:${NC}"
    echo -e "${YELLOW}   cd backend && uvicorn app.main:app --reload --port 8005${NC}"
    echo ""
fi

# Matar túneles anteriores
echo -e "${YELLOW}🧹 Limpiando túneles anteriores...${NC}"
pkill -f "ngrok" 2>/dev/null
sleep 2

# Iniciar túnel
echo -e "${CYAN}🚀 Iniciando túnel ngrok...${NC}"
ngrok http $FRONTEND_PORT --log=stdout &
NGROK_PID=$!
sleep 4

# Obtener URL del túnel
echo -e "${YELLOW}📡 Obteniendo URL del túnel...${NC}"

TUNNEL_URL=""
for i in {1..15}; do
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -oP '"public_url":"https://[^"]+' | grep -oP 'https://[^"]+' | head -1)
    
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    
    echo -e "${YELLOW}   Esperando... ($i/15)${NC}"
    sleep 2
done

if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}❌ Error obteniendo URL de ngrok${NC}"
    echo "   Verifica tu token de ngrok:"
    echo "   ngrok config add-authtoken <tu-token>"
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

# Mostrar resultado
clear
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ ¡LISTO PARA COMPARTIR!                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${CYAN}📱 LINK PARA TU AMIGO:${NC}"
echo ""
echo -e "   ${YELLOW}${TUNNEL_URL}${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📋 Tu amigo puede:${NC}"
echo -e "   ✅ Ver todo el sistema"
echo -e "   ✅ Navegar por Clientes, Inventario, Pedidos, Facturas..."
echo -e "   ✅ Los cambios se guardan en su navegador local"
echo ""
echo -e "${PURPLE}☁️  Para sincronizar datos entre dispositivos:${NC}"
echo -e "   1. En tu PC: Click en nube ☁️ → 'Subir a la nube'"
echo -e "   2. Tu amigo: Click en nube ☁️ → 'Descargar de la nube'"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}📊 Panel de ngrok: ${NC}http://localhost:4040"
echo ""
echo -e "${RED}⏹️  Presiona Ctrl+C para detener${NC}"
echo ""

# Copiar al portapapeles
if command -v xclip &> /dev/null; then
    echo "$TUNNEL_URL" | xclip -selection clipboard
    echo -e "${GREEN}📋 URL copiada al portapapeles${NC}"
elif command -v xsel &> /dev/null; then
    echo "$TUNNEL_URL" | xsel --clipboard
    echo -e "${GREEN}📋 URL copiada al portapapeles${NC}"
fi

# Cleanup al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Deteniendo túnel...${NC}"
    pkill -f "ngrok"
    echo -e "${GREEN}✅ ¡Hasta luego!${NC}"
    exit 0
}

trap cleanup INT

# Mantener activo
while true; do
    sleep 30
    if ! pgrep -f "ngrok" > /dev/null; then
        echo -e "${RED}❌ El túnel se cerró${NC}"
        cleanup
    fi
done

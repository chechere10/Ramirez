#!/bin/bash
# ===========================================
# ManifestoCross - Setup del Servidor
# Ejecutar en el servidor de DigitalOcean
# ===========================================

set -e

echo "🔧 Configurando servidor para ManifestoCross..."

# Actualizar sistema
echo "📦 Actualizando sistema..."
apt update && apt upgrade -y

# Instalar Docker si no está instalado
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Agregar usuario al grupo docker
    usermod -aG docker $USER
fi

# Instalar Docker Compose plugin
if ! docker compose version &> /dev/null; then
    echo "🐳 Instalando Docker Compose..."
    apt install -y docker-compose-plugin
fi

# Instalar otras herramientas útiles
apt install -y git curl wget htop

# Configurar firewall
echo "🔥 Configurando firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Crear directorios necesarios
mkdir -p /opt/manifestocross/certbot/www
mkdir -p /opt/manifestocross/certbot/conf

echo "✅ Servidor configurado correctamente"

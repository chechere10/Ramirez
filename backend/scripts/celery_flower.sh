#!/bin/bash
# Script para iniciar Flower (monitoreo de Celery)
# Uso: ./scripts/celery_flower.sh [opciones]

set -e

# Directorio base
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Activar entorno virtual si existe
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Configuración
PORT=${FLOWER_PORT:-5555}

echo "============================================"
echo "  ManifestoCross - Flower (Celery Monitor)"
echo "============================================"
echo "Acceder en: http://localhost:$PORT"
echo "============================================"

# Iniciar Flower
exec celery -A app.core.celery_app flower \
    --port=$PORT \
    --broker_api="redis://localhost:6382/0" \
    "$@"

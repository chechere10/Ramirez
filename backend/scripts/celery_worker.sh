#!/bin/bash
# Script para iniciar worker de Celery
# Uso: ./scripts/celery_worker.sh [opciones]

set -e

# Directorio base
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Activar entorno virtual si existe
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Configuración por defecto
CONCURRENCY=${CELERY_CONCURRENCY:-2}
QUEUES=${CELERY_QUEUES:-"default,pdf_processing,ocr,notifications"}
LOGLEVEL=${CELERY_LOGLEVEL:-"INFO"}

echo "============================================"
echo "  ManifestoCross - Celery Worker"
echo "============================================"
echo "Directorio: $PROJECT_DIR"
echo "Concurrencia: $CONCURRENCY"
echo "Colas: $QUEUES"
echo "Nivel de log: $LOGLEVEL"
echo "============================================"

# Iniciar worker
exec celery -A app.core.celery_app worker \
    --loglevel=$LOGLEVEL \
    --concurrency=$CONCURRENCY \
    --queues=$QUEUES \
    --hostname="worker@%h" \
    --events \
    "$@"

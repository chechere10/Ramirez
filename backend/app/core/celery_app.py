"""
Configuración de Celery para procesamiento asíncrono.
Fase 3.6 - Sistema de colas con Redis como broker.
"""

from celery import Celery
from kombu import Exchange, Queue

from app.core.config import settings


# Configuración de Celery
celery_app = Celery(
    "manifestocross",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.pdf_tasks"],
)

# Configuración general
celery_app.conf.update(
    # Serialización
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    
    # Zona horaria
    timezone="America/Mexico_City",
    enable_utc=True,
    
    # Resultados
    result_expires=3600,  # 1 hora
    result_extended=True,  # Incluir info adicional en resultados
    
    # Reintentos
    task_acks_late=True,  # ACK después de ejecutar (para reintentos)
    task_reject_on_worker_lost=True,  # Rechazar si worker muere
    
    # Concurrencia
    worker_prefetch_multiplier=1,  # Un task a la vez por worker
    
    # Logging
    worker_hijack_root_logger=False,  # No sobrescribir loguru
    
    # Tracking
    task_track_started=True,  # Rastrear estado STARTED
    task_send_sent_event=True,  # Enviar eventos
)

# Definir colas
celery_app.conf.task_queues = (
    Queue(
        "default",
        Exchange("default"),
        routing_key="default",
    ),
    Queue(
        "pdf_processing",
        Exchange("pdf_processing"),
        routing_key="pdf.#",
        queue_arguments={"x-max-priority": 10},  # Prioridad
    ),
    Queue(
        "ocr",
        Exchange("ocr"),
        routing_key="ocr.#",
        queue_arguments={"x-max-priority": 5},
    ),
    Queue(
        "notifications",
        Exchange("notifications"),
        routing_key="notify.#",
    ),
)

# Ruteo de tareas
celery_app.conf.task_routes = {
    "app.tasks.pdf_tasks.procesar_pdf_async": {"queue": "pdf_processing"},
    "app.tasks.pdf_tasks.procesar_manifiesto_async": {"queue": "pdf_processing"},
    "app.tasks.pdf_tasks.procesar_factura_async": {"queue": "pdf_processing"},
    "app.tasks.pdf_tasks.aplicar_ocr_async": {"queue": "ocr"},
    "app.tasks.pdf_tasks.notificar_completado": {"queue": "notifications"},
}

# Configuración de reintentos por defecto
celery_app.conf.task_default_retry_delay = 60  # 60 segundos
celery_app.conf.task_max_retries = 3  # Máximo 3 reintentos


def get_celery_app() -> Celery:
    """Obtiene la instancia de Celery."""
    return celery_app

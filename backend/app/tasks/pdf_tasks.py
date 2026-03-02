"""
Tareas asíncronas para procesamiento de PDFs.
Fase 3.6 - Sistema de colas Celery.
"""

import base64
import json
import traceback
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from celery import shared_task, states
from celery.exceptions import MaxRetriesExceededError, Reject, Retry
from celery.result import AsyncResult
from loguru import logger

from app.core.celery_app import celery_app
from app.core.config import settings


class EstadoTarea(str, Enum):
    """Estados de una tarea asíncrona."""
    
    PENDIENTE = "PENDING"
    RECIBIDO = "RECEIVED"
    INICIADO = "STARTED"
    EXITO = "SUCCESS"
    FALLO = "FAILURE"
    REINTENTANDO = "RETRY"
    REVOCADO = "REVOKED"
    PROGRESO = "PROGRESS"


class TipoNotificacion(str, Enum):
    """Tipos de notificación."""
    
    COMPLETADO = "completado"
    ERROR = "error"
    PROGRESO = "progreso"
    ADVERTENCIA = "advertencia"


# ============================================================================
# TAREA: Procesar PDF genérico
# ============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.pdf_tasks.procesar_pdf_async",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    track_started=True,
    time_limit=600,  # 10 minutos máximo
    soft_time_limit=540,  # Warning a los 9 minutos
)
def procesar_pdf_async(
    self,
    contenido_base64: str,
    nombre_archivo: str,
    tipo_documento: str = "manifiesto",
    usuario_id: Optional[int] = None,
    descripcion: Optional[str] = None,
    opciones: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Tarea asíncrona para procesar un PDF.
    
    Args:
        contenido_base64: Contenido del PDF en base64
        nombre_archivo: Nombre del archivo original
        tipo_documento: "manifiesto" o "factura"
        usuario_id: ID del usuario
        descripcion: Descripción opcional
        opciones: Opciones adicionales de procesamiento
        
    Returns:
        Dict con resumen del procesamiento
    """
    task_id = self.request.id
    opciones = opciones or {}
    
    logger.info(
        f"[Task {task_id}] Iniciando procesamiento de {tipo_documento}: "
        f"{nombre_archivo}"
    )
    
    try:
        # Actualizar estado: procesando
        self.update_state(
            state=EstadoTarea.PROGRESO.value,
            meta={
                "etapa": "iniciando",
                "progreso": 0,
                "mensaje": "Decodificando archivo...",
            }
        )
        
        # Decodificar contenido
        try:
            contenido = base64.b64decode(contenido_base64)
        except Exception as e:
            raise ValueError(f"Error decodificando base64: {e}")
        
        # Actualizar progreso
        self.update_state(
            state=EstadoTarea.PROGRESO.value,
            meta={
                "etapa": "cargando",
                "progreso": 10,
                "mensaje": "Archivo cargado, iniciando extracción...",
            }
        )
        
        # Procesar según tipo
        if tipo_documento == "manifiesto":
            resultado = _procesar_manifiesto_interno(
                self,
                contenido,
                nombre_archivo,
                usuario_id,
                descripcion,
                opciones,
            )
        elif tipo_documento == "factura":
            resultado = _procesar_factura_interno(
                self,
                contenido,
                nombre_archivo,
                usuario_id,
                opciones,
            )
        else:
            raise ValueError(f"Tipo de documento no válido: {tipo_documento}")
        
        # Notificar completado
        notificar_completado.delay(
            task_id=task_id,
            tipo=TipoNotificacion.COMPLETADO.value,
            datos={
                "nombre_archivo": nombre_archivo,
                "tipo_documento": tipo_documento,
                "resultado": resultado,
            },
            usuario_id=usuario_id,
        )
        
        logger.info(
            f"[Task {task_id}] Procesamiento completado exitosamente"
        )
        
        return resultado
        
    except Retry:
        # Reintento explícito, propagar
        raise
        
    except Exception as e:
        logger.exception(f"[Task {task_id}] Error en procesamiento: {e}")
        
        # Determinar si reintentar
        if self.request.retries < self.max_retries:
            # Calcular delay exponencial
            delay = 60 * (2 ** self.request.retries)  # 60, 120, 240 segundos
            
            logger.warning(
                f"[Task {task_id}] Reintentando en {delay}s "
                f"(intento {self.request.retries + 1}/{self.max_retries})"
            )
            
            # Notificar reintento
            notificar_completado.delay(
                task_id=task_id,
                tipo=TipoNotificacion.ADVERTENCIA.value,
                datos={
                    "mensaje": f"Reintentando en {delay} segundos",
                    "error": str(e),
                    "intento": self.request.retries + 1,
                },
                usuario_id=usuario_id,
            )
            
            raise self.retry(exc=e, countdown=delay)
        
        # Máximo de reintentos alcanzado
        error_info = {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "nombre_archivo": nombre_archivo,
            "tipo_documento": tipo_documento,
            "reintentos": self.request.retries,
        }
        
        # Notificar error final
        notificar_completado.delay(
            task_id=task_id,
            tipo=TipoNotificacion.ERROR.value,
            datos=error_info,
            usuario_id=usuario_id,
        )
        
        raise


def _procesar_manifiesto_interno(
    task,
    contenido: bytes,
    nombre_archivo: str,
    usuario_id: Optional[int],
    descripcion: Optional[str],
    opciones: Dict[str, Any],
) -> Dict[str, Any]:
    """Procesa un manifiesto internamente."""
    from app.services.manifiesto_processor import ManifiestoProcessor
    from app.services.ocr_extractor import CalidadImagen, IdiomaOCR
    from app.core.database import get_db_context
    
    # Configurar opciones
    usar_ocr = opciones.get("usar_ocr", True)
    calidad_ocr = CalidadImagen(
        opciones.get("calidad_ocr", CalidadImagen.ALTA.value)
    )
    idioma_ocr = IdiomaOCR(
        opciones.get("idioma_ocr", IdiomaOCR.ESPAÑOL_INGLES.value)
    )
    tipos_codigo = opciones.get("tipos_codigo", None)
    
    task.update_state(
        state=EstadoTarea.PROGRESO.value,
        meta={
            "etapa": "extrayendo_texto",
            "progreso": 20,
            "mensaje": "Extrayendo texto del PDF...",
        }
    )
    
    # Procesar con sesión de base de datos
    with get_db_context() as db:
        processor = ManifiestoProcessor(
            db=db,
            usar_ocr_si_necesario=usar_ocr,
            calidad_ocr=calidad_ocr,
            idioma_ocr=idioma_ocr,
        )
        
        # Actualizar progreso durante el procesamiento
        task.update_state(
            state=EstadoTarea.PROGRESO.value,
            meta={
                "etapa": "procesando",
                "progreso": 50,
                "mensaje": "Procesando documento...",
            }
        )
        
        resumen = processor.procesar(
            source=contenido,
            nombre_archivo=nombre_archivo,
            usuario_id=usuario_id,
            descripcion=descripcion,
            tipos_codigo=tipos_codigo,
        )
    
    task.update_state(
        state=EstadoTarea.PROGRESO.value,
        meta={
            "etapa": "completado",
            "progreso": 100,
            "mensaje": "Procesamiento completado",
        }
    )
    
    return resumen.to_dict()


def _procesar_factura_interno(
    task,
    contenido: bytes,
    nombre_archivo: str,
    usuario_id: Optional[int],
    opciones: Dict[str, Any],
) -> Dict[str, Any]:
    """Procesa una factura internamente."""
    from app.services.factura_processor import FacturaProcessor
    from app.core.database import get_db_context
    
    task.update_state(
        state=EstadoTarea.PROGRESO.value,
        meta={
            "etapa": "extrayendo_texto",
            "progreso": 20,
            "mensaje": "Extrayendo texto de la factura...",
        }
    )
    
    with get_db_context() as db:
        processor = FacturaProcessor(db=db)
        
        task.update_state(
            state=EstadoTarea.PROGRESO.value,
            meta={
                "etapa": "procesando",
                "progreso": 50,
                "mensaje": "Extrayendo códigos de la factura...",
            }
        )
        
        resultado = processor.cargar_desde_pdf(
            contenido,
            nombre_archivo=nombre_archivo,
        )
    
    task.update_state(
        state=EstadoTarea.PROGRESO.value,
        meta={
            "etapa": "completado",
            "progreso": 100,
            "mensaje": "Factura procesada",
        }
    )
    
    return {
        "archivo": nombre_archivo,
        "total_codigos": resultado.total_cargados,
        "codigos_validos": resultado.validos,
        "codigos_invalidos": resultado.invalidos,
        "duplicados": resultado.duplicados,
        "errores": resultado.errores,
    }


# ============================================================================
# TAREA: Procesar manifiesto específico
# ============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.pdf_tasks.procesar_manifiesto_async",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    track_started=True,
    time_limit=600,
    soft_time_limit=540,
)
def procesar_manifiesto_async(
    self,
    ruta_archivo: str,
    usuario_id: Optional[int] = None,
    descripcion: Optional[str] = None,
    usar_ocr: bool = True,
    tipos_codigo: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Procesa un manifiesto desde una ruta de archivo.
    
    Args:
        ruta_archivo: Ruta al archivo PDF
        usuario_id: ID del usuario
        descripcion: Descripción opcional
        usar_ocr: Aplicar OCR si es necesario
        tipos_codigo: Lista de tipos de código a extraer
        
    Returns:
        Dict con resumen del procesamiento
    """
    task_id = self.request.id
    
    logger.info(f"[Task {task_id}] Procesando manifiesto: {ruta_archivo}")
    
    try:
        from app.services.manifiesto_processor import ManifiestoProcessor
        from app.services.code_extractor import TipoCodigo
        from app.core.database import get_db_context
        
        path = Path(ruta_archivo)
        if not path.exists():
            raise FileNotFoundError(f"Archivo no encontrado: {ruta_archivo}")
        
        # Convertir tipos de código si se especificaron
        tipos = None
        if tipos_codigo:
            tipos = [TipoCodigo(t) for t in tipos_codigo]
        
        self.update_state(
            state=EstadoTarea.PROGRESO.value,
            meta={
                "etapa": "procesando",
                "progreso": 30,
                "mensaje": f"Procesando {path.name}...",
            }
        )
        
        with get_db_context() as db:
            processor = ManifiestoProcessor(
                db=db,
                usar_ocr_si_necesario=usar_ocr,
            )
            
            resumen = processor.procesar(
                source=path,
                nombre_archivo=path.name,
                usuario_id=usuario_id,
                descripcion=descripcion,
                tipos_codigo=tipos,
            )
        
        # Notificar completado
        notificar_completado.delay(
            task_id=task_id,
            tipo=TipoNotificacion.COMPLETADO.value,
            datos=resumen.to_dict(),
            usuario_id=usuario_id,
        )
        
        logger.info(f"[Task {task_id}] Manifiesto procesado exitosamente")
        
        return resumen.to_dict()
        
    except Exception as e:
        logger.exception(f"[Task {task_id}] Error procesando manifiesto: {e}")
        
        if self.request.retries < self.max_retries:
            delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=delay)
        
        raise


# ============================================================================
# TAREA: Procesar factura específica
# ============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.pdf_tasks.procesar_factura_async",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    track_started=True,
    time_limit=300,  # 5 minutos
    soft_time_limit=270,
)
def procesar_factura_async(
    self,
    ruta_archivo: str,
    usuario_id: Optional[int] = None,
    origen: str = "pdf",
) -> Dict[str, Any]:
    """
    Procesa una factura desde una ruta de archivo.
    
    Args:
        ruta_archivo: Ruta al archivo (PDF, CSV, Excel)
        usuario_id: ID del usuario
        origen: Tipo de origen ("pdf", "csv", "excel")
        
    Returns:
        Dict con resumen del procesamiento
    """
    task_id = self.request.id
    
    logger.info(f"[Task {task_id}] Procesando factura ({origen}): {ruta_archivo}")
    
    try:
        from app.services.factura_processor import FacturaProcessor
        from app.core.database import get_db_context
        
        path = Path(ruta_archivo)
        if not path.exists():
            raise FileNotFoundError(f"Archivo no encontrado: {ruta_archivo}")
        
        self.update_state(
            state=EstadoTarea.PROGRESO.value,
            meta={
                "etapa": "procesando",
                "progreso": 30,
                "mensaje": f"Procesando {path.name}...",
            }
        )
        
        with get_db_context() as db:
            processor = FacturaProcessor(db=db)
            
            if origen == "csv":
                resultado = processor.cargar_desde_csv(path)
            elif origen == "excel":
                resultado = processor.cargar_desde_excel(path)
            else:  # pdf
                with open(path, "rb") as f:
                    resultado = processor.cargar_desde_pdf(
                        f.read(),
                        nombre_archivo=path.name,
                    )
        
        resultado_dict = {
            "archivo": path.name,
            "origen": origen,
            "total_cargados": resultado.total_cargados,
            "validos": resultado.validos,
            "invalidos": resultado.invalidos,
            "duplicados": resultado.duplicados,
            "errores": resultado.errores,
        }
        
        # Notificar completado
        notificar_completado.delay(
            task_id=task_id,
            tipo=TipoNotificacion.COMPLETADO.value,
            datos=resultado_dict,
            usuario_id=usuario_id,
        )
        
        logger.info(f"[Task {task_id}] Factura procesada exitosamente")
        
        return resultado_dict
        
    except Exception as e:
        logger.exception(f"[Task {task_id}] Error procesando factura: {e}")
        
        if self.request.retries < self.max_retries:
            delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=delay)
        
        raise


# ============================================================================
# TAREA: Aplicar OCR
# ============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.pdf_tasks.aplicar_ocr_async",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
    track_started=True,
    time_limit=900,  # 15 minutos (OCR es lento)
    soft_time_limit=840,
)
def aplicar_ocr_async(
    self,
    contenido_base64: str,
    paginas: Optional[List[int]] = None,
    idioma: str = "spa+eng",
    calidad: str = "alta",
) -> Dict[str, Any]:
    """
    Aplica OCR a un PDF de forma asíncrona.
    
    Args:
        contenido_base64: PDF en base64
        paginas: Lista de páginas a procesar (None = todas)
        idioma: Código de idioma(s) para Tesseract
        calidad: Calidad de imagen ("baja", "media", "alta")
        
    Returns:
        Dict con texto extraído por página
    """
    task_id = self.request.id
    
    logger.info(f"[Task {task_id}] Aplicando OCR...")
    
    try:
        from app.services.ocr_extractor import (
            OCRExtractor,
            ConfiguracionOCR,
            CalidadImagen,
            IdiomaOCR,
        )
        
        # Decodificar contenido
        contenido = base64.b64decode(contenido_base64)
        
        # Mapear calidad
        calidad_map = {
            "baja": CalidadImagen.BAJA,
            "media": CalidadImagen.MEDIA,
            "alta": CalidadImagen.ALTA,
        }
        
        config = ConfiguracionOCR(
            idioma=IdiomaOCR.ESPAÑOL_INGLES,  # Usar predeterminado
            calidad=calidad_map.get(calidad, CalidadImagen.ALTA),
            optimizar_imagen=True,
        )
        
        extractor = OCRExtractor(config)
        
        self.update_state(
            state=EstadoTarea.PROGRESO.value,
            meta={
                "etapa": "ocr",
                "progreso": 20,
                "mensaje": "Aplicando OCR...",
            }
        )
        
        if paginas:
            # OCR selectivo
            resultados = {}
            total = len(paginas)
            
            for i, pagina in enumerate(paginas):
                resultado = extractor.extraer_pagina_especifica(
                    contenido,
                    pagina,
                    config,
                )
                
                if resultado.exito:
                    resultados[str(pagina)] = {
                        "texto": resultado.texto,
                        "confianza": resultado.confianza,
                    }
                
                # Actualizar progreso
                progreso = 20 + int(80 * (i + 1) / total)
                self.update_state(
                    state=EstadoTarea.PROGRESO.value,
                    meta={
                        "etapa": "ocr",
                        "progreso": progreso,
                        "mensaje": f"Procesando página {pagina}...",
                    }
                )
            
            return {
                "paginas_procesadas": len(resultados),
                "textos": resultados,
            }
        
        else:
            # OCR completo
            resultado = extractor.extraer(contenido, config)
            
            return {
                "exito": resultado.exito,
                "paginas_procesadas": resultado.total_paginas,
                "texto_completo": resultado.texto_completo,
                "confianza_promedio": resultado.confianza_promedio,
            }
            
    except Exception as e:
        logger.exception(f"[Task {task_id}] Error en OCR: {e}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=30)
        
        raise


# ============================================================================
# TAREA: Notificación de completado
# ============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.pdf_tasks.notificar_completado",
    max_retries=2,
    default_retry_delay=10,
    acks_late=True,
)
def notificar_completado(
    self,
    task_id: str,
    tipo: str,
    datos: Dict[str, Any],
    usuario_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Notifica el completado de una tarea.
    
    Puede ser extendido para enviar:
    - WebSocket push
    - Email
    - Slack/Discord
    - Almacenar en base de datos
    
    Args:
        task_id: ID de la tarea original
        tipo: Tipo de notificación
        datos: Datos de la notificación
        usuario_id: ID del usuario a notificar
        
    Returns:
        Dict confirmando la notificación
    """
    logger.info(
        f"[Notificación] Task {task_id} - {tipo} - Usuario {usuario_id}"
    )
    
    try:
        # Registrar la notificación en Redis para polling
        import redis
        
        r = redis.from_url(settings.REDIS_URL)
        
        notificacion = {
            "task_id": task_id,
            "tipo": tipo,
            "datos": datos,
            "usuario_id": usuario_id,
            "timestamp": datetime.now().isoformat(),
        }
        
        # Publicar en canal de notificaciones
        canal = f"notificaciones:{usuario_id or 'global'}"
        r.publish(canal, json.dumps(notificacion))
        
        # También guardar en lista para polling
        lista = f"notificaciones_lista:{usuario_id or 'global'}"
        r.lpush(lista, json.dumps(notificacion))
        r.ltrim(lista, 0, 99)  # Mantener últimas 100
        r.expire(lista, 86400)  # Expirar en 24 horas
        
        logger.debug(f"Notificación publicada en {canal}")
        
        return {
            "enviado": True,
            "canal": canal,
            "timestamp": notificacion["timestamp"],
        }
        
    except Exception as e:
        logger.warning(f"Error enviando notificación: {e}")
        
        # Las notificaciones no son críticas, no reintentar mucho
        if self.request.retries < 1:
            raise self.retry(exc=e, countdown=5)
        
        return {
            "enviado": False,
            "error": str(e),
        }


# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================

def obtener_estado_tarea(task_id: str) -> Dict[str, Any]:
    """
    Obtiene el estado actual de una tarea.
    
    Args:
        task_id: ID de la tarea
        
    Returns:
        Dict con estado y metadatos
    """
    resultado = AsyncResult(task_id, app=celery_app)
    
    estado = {
        "task_id": task_id,
        "estado": resultado.state,
        "listo": resultado.ready(),
        "exitoso": resultado.successful() if resultado.ready() else None,
        "fallido": resultado.failed() if resultado.ready() else None,
    }
    
    if resultado.state == EstadoTarea.PROGRESO.value:
        estado["progreso"] = resultado.info
    elif resultado.state == states.SUCCESS:
        estado["resultado"] = resultado.result
    elif resultado.state == states.FAILURE:
        estado["error"] = str(resultado.result)
        estado["traceback"] = resultado.traceback
    
    return estado


def cancelar_tarea(task_id: str, terminar: bool = False) -> bool:
    """
    Cancela una tarea en ejecución.
    
    Args:
        task_id: ID de la tarea
        terminar: Si True, termina la tarea inmediatamente
        
    Returns:
        True si se envió la señal de cancelación
    """
    celery_app.control.revoke(
        task_id,
        terminate=terminar,
        signal="SIGTERM" if terminar else None,
    )
    
    logger.info(f"Tarea {task_id} cancelada (terminate={terminar})")
    
    return True


def obtener_tareas_activas() -> List[Dict[str, Any]]:
    """
    Obtiene lista de tareas activas en todos los workers.
    
    Returns:
        Lista de tareas activas
    """
    inspect = celery_app.control.inspect()
    activas = inspect.active() or {}
    
    tareas = []
    for worker, lista in activas.items():
        for tarea in lista:
            tareas.append({
                "worker": worker,
                "id": tarea.get("id"),
                "nombre": tarea.get("name"),
                "args": tarea.get("args"),
                "tiempo_inicio": tarea.get("time_start"),
            })
    
    return tareas


def obtener_estadisticas() -> Dict[str, Any]:
    """
    Obtiene estadísticas de los workers de Celery.
    
    Returns:
        Dict con estadísticas
    """
    inspect = celery_app.control.inspect()
    
    return {
        "activas": inspect.active() or {},
        "reservadas": inspect.reserved() or {},
        "programadas": inspect.scheduled() or {},
        "estadisticas": inspect.stats() or {},
    }

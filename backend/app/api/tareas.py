"""
Endpoints para gestión de tareas asíncronas.
Fase 3.6 - Sistema de colas Celery.
"""

import base64
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from loguru import logger
from pydantic import BaseModel, Field

from app.tasks.pdf_tasks import (
    EstadoTarea,
    TipoNotificacion,
    aplicar_ocr_async,
    cancelar_tarea,
    obtener_estado_tarea,
    obtener_estadisticas,
    obtener_tareas_activas,
    procesar_factura_async,
    procesar_manifiesto_async,
    procesar_pdf_async,
)


router = APIRouter(prefix="/tareas", tags=["Tareas Asíncronas"])


# ============================================================================
# SCHEMAS
# ============================================================================

class TareaEnviada(BaseModel):
    """Respuesta cuando se envía una tarea."""
    
    task_id: str = Field(..., description="ID único de la tarea")
    mensaje: str = Field(..., description="Mensaje de confirmación")
    estado: str = Field(default="PENDING", description="Estado inicial")


class EstadoTareaResponse(BaseModel):
    """Respuesta con estado de una tarea."""
    
    task_id: str
    estado: str
    listo: bool
    exitoso: Optional[bool] = None
    fallido: Optional[bool] = None
    progreso: Optional[Dict[str, Any]] = None
    resultado: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class OpcionesProcesamiento(BaseModel):
    """Opciones para procesamiento de documentos."""
    
    usar_ocr: bool = Field(default=True, description="Aplicar OCR si es necesario")
    calidad_ocr: str = Field(default="alta", description="Calidad OCR: baja, media, alta")
    idioma_ocr: str = Field(default="spa+eng", description="Idioma(s) para OCR")
    tipos_codigo: Optional[List[str]] = Field(
        default=None,
        description="Tipos de código a extraer (None = todos)"
    )


class ProcesarPDFRequest(BaseModel):
    """Request para procesar PDF vía API."""
    
    tipo_documento: str = Field(
        default="manifiesto",
        description="Tipo: manifiesto o factura"
    )
    descripcion: Optional[str] = Field(
        default=None,
        description="Descripción del documento"
    )
    opciones: OpcionesProcesamiento = Field(
        default_factory=OpcionesProcesamiento,
        description="Opciones de procesamiento"
    )


# ============================================================================
# ENDPOINTS: Procesamiento de documentos
# ============================================================================

@router.post(
    "/procesar-pdf",
    response_model=TareaEnviada,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Procesar PDF de forma asíncrona",
)
async def procesar_pdf(
    archivo: UploadFile = File(..., description="Archivo PDF a procesar"),
    tipo_documento: str = Query(
        default="manifiesto",
        description="Tipo de documento: manifiesto o factura"
    ),
    descripcion: Optional[str] = Query(
        default=None,
        description="Descripción del documento"
    ),
    usar_ocr: bool = Query(
        default=True,
        description="Aplicar OCR si es necesario"
    ),
    usuario_id: Optional[int] = Query(
        default=None,
        description="ID del usuario"
    ),
) -> TareaEnviada:
    """
    Envía un PDF para procesamiento asíncrono.
    
    El archivo se procesa en background y se puede consultar
    el estado con el endpoint /tareas/{task_id}.
    
    Returns:
        TareaEnviada con el task_id para seguimiento
    """
    # Validar tipo de documento
    if tipo_documento not in ("manifiesto", "factura"):
        raise HTTPException(
            status_code=400,
            detail="tipo_documento debe ser 'manifiesto' o 'factura'"
        )
    
    # Validar archivo
    if not archivo.filename:
        raise HTTPException(status_code=400, detail="Archivo sin nombre")
    
    if not archivo.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Solo se aceptan archivos PDF"
        )
    
    # Leer contenido
    try:
        contenido = await archivo.read()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error leyendo archivo: {e}"
        )
    
    # Validar tamaño (50 MB max)
    if len(contenido) > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Archivo demasiado grande (máximo 50 MB)"
        )
    
    # Codificar en base64 para enviar a Celery
    contenido_base64 = base64.b64encode(contenido).decode("utf-8")
    
    # Enviar tarea
    tarea = procesar_pdf_async.delay(
        contenido_base64=contenido_base64,
        nombre_archivo=archivo.filename,
        tipo_documento=tipo_documento,
        usuario_id=usuario_id,
        descripcion=descripcion,
        opciones={"usar_ocr": usar_ocr},
    )
    
    logger.info(
        f"Tarea de procesamiento enviada: {tarea.id} - {archivo.filename}"
    )
    
    return TareaEnviada(
        task_id=tarea.id,
        mensaje=f"Procesamiento de {tipo_documento} iniciado",
        estado=EstadoTarea.PENDIENTE.value,
    )


@router.post(
    "/procesar-manifiesto",
    response_model=TareaEnviada,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Procesar manifiesto desde ruta",
)
async def procesar_manifiesto_desde_ruta(
    ruta_archivo: str = Query(..., description="Ruta al archivo PDF"),
    usuario_id: Optional[int] = Query(default=None),
    descripcion: Optional[str] = Query(default=None),
    usar_ocr: bool = Query(default=True),
) -> TareaEnviada:
    """
    Procesa un manifiesto desde una ruta de archivo en el servidor.
    
    Útil para procesamiento por lotes o archivos ya subidos.
    """
    tarea = procesar_manifiesto_async.delay(
        ruta_archivo=ruta_archivo,
        usuario_id=usuario_id,
        descripcion=descripcion,
        usar_ocr=usar_ocr,
    )
    
    logger.info(f"Tarea de manifiesto enviada: {tarea.id} - {ruta_archivo}")
    
    return TareaEnviada(
        task_id=tarea.id,
        mensaje="Procesamiento de manifiesto iniciado",
        estado=EstadoTarea.PENDIENTE.value,
    )


@router.post(
    "/procesar-factura",
    response_model=TareaEnviada,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Procesar factura desde ruta",
)
async def procesar_factura_desde_ruta(
    ruta_archivo: str = Query(..., description="Ruta al archivo"),
    origen: str = Query(
        default="pdf",
        description="Tipo de archivo: pdf, csv, excel"
    ),
    usuario_id: Optional[int] = Query(default=None),
) -> TareaEnviada:
    """
    Procesa una factura desde una ruta de archivo en el servidor.
    
    Soporta archivos PDF, CSV y Excel.
    """
    if origen not in ("pdf", "csv", "excel"):
        raise HTTPException(
            status_code=400,
            detail="origen debe ser 'pdf', 'csv' o 'excel'"
        )
    
    tarea = procesar_factura_async.delay(
        ruta_archivo=ruta_archivo,
        usuario_id=usuario_id,
        origen=origen,
    )
    
    logger.info(f"Tarea de factura enviada: {tarea.id} - {ruta_archivo}")
    
    return TareaEnviada(
        task_id=tarea.id,
        mensaje=f"Procesamiento de factura ({origen}) iniciado",
        estado=EstadoTarea.PENDIENTE.value,
    )


@router.post(
    "/aplicar-ocr",
    response_model=TareaEnviada,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Aplicar OCR a PDF",
)
async def aplicar_ocr(
    archivo: UploadFile = File(..., description="Archivo PDF"),
    paginas: Optional[str] = Query(
        default=None,
        description="Páginas a procesar (ej: '1,3,5' o vacío para todas)"
    ),
    calidad: str = Query(default="alta", description="Calidad: baja, media, alta"),
) -> TareaEnviada:
    """
    Aplica OCR a un PDF de forma asíncrona.
    
    El OCR puede tardar varios minutos dependiendo del número de páginas.
    """
    # Leer y codificar
    contenido = await archivo.read()
    contenido_base64 = base64.b64encode(contenido).decode("utf-8")
    
    # Parsear páginas si se especificaron
    lista_paginas = None
    if paginas:
        try:
            lista_paginas = [int(p.strip()) for p in paginas.split(",")]
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Formato de páginas inválido. Use: 1,2,3"
            )
    
    tarea = aplicar_ocr_async.delay(
        contenido_base64=contenido_base64,
        paginas=lista_paginas,
        calidad=calidad,
    )
    
    logger.info(f"Tarea de OCR enviada: {tarea.id}")
    
    return TareaEnviada(
        task_id=tarea.id,
        mensaje="OCR iniciado",
        estado=EstadoTarea.PENDIENTE.value,
    )


# ============================================================================
# ENDPOINTS: Gestión de tareas
# ============================================================================

@router.get(
    "/{task_id}",
    response_model=EstadoTareaResponse,
    summary="Obtener estado de una tarea",
)
async def obtener_estado(task_id: str) -> EstadoTareaResponse:
    """
    Obtiene el estado actual de una tarea.
    
    Estados posibles:
    - PENDING: Tarea en cola, esperando
    - STARTED: Tarea iniciada
    - PROGRESS: Tarea en progreso (con detalles)
    - SUCCESS: Tarea completada exitosamente
    - FAILURE: Tarea fallida
    - RETRY: Tarea reintentando
    - REVOKED: Tarea cancelada
    """
    estado = obtener_estado_tarea(task_id)
    
    return EstadoTareaResponse(**estado)


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Cancelar una tarea",
)
async def cancelar(
    task_id: str,
    terminar: bool = Query(
        default=False,
        description="Terminar inmediatamente (SIGTERM)"
    ),
) -> Dict[str, Any]:
    """
    Cancela una tarea pendiente o en ejecución.
    
    Si terminar=True, la tarea se detendrá inmediatamente.
    Si terminar=False, la tarea no comenzará si está pendiente.
    """
    exito = cancelar_tarea(task_id, terminar=terminar)
    
    return {
        "task_id": task_id,
        "cancelado": exito,
        "terminado": terminar,
    }


@router.get(
    "/",
    summary="Listar tareas activas",
)
async def listar_activas() -> Dict[str, Any]:
    """
    Lista todas las tareas activas en los workers.
    """
    tareas = obtener_tareas_activas()
    
    return {
        "total": len(tareas),
        "tareas": tareas,
    }


@router.get(
    "/stats/workers",
    summary="Estadísticas de workers",
)
async def estadisticas_workers() -> Dict[str, Any]:
    """
    Obtiene estadísticas detalladas de los workers de Celery.
    """
    return obtener_estadisticas()

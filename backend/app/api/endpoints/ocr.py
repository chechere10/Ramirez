"""
Endpoints para gestión del servicio OCR optimizado.

Permite:
- Ver estadísticas del caché de OCR
- Limpiar el caché
- Pre-procesar PDFs con OCR
- Ver estado del servicio
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from loguru import logger

from app.services.ocr_service import (
    get_ocr_service,
    OCRQuality,
    DocumentType,
    process_pdf_with_ocr
)

router = APIRouter()


class OCRStatsResponse(BaseModel):
    """Respuesta con estadísticas del OCR."""
    cache_enabled: bool
    total_entries: int = 0
    total_size_mb: float = 0
    cache_dir: str = ""
    service_available: bool = True


class OCRPreprocessRequest(BaseModel):
    """Solicitud para preprocesar un PDF."""
    force_ocr: bool = False
    quality: str = "standard"  # fast, standard, high


class OCRPreprocessResponse(BaseModel):
    """Respuesta del preprocesamiento OCR."""
    success: bool
    pdf_hash: str = ""
    document_type: str = ""
    total_pages: int = 0
    total_words: int = 0
    processing_time_ms: float = 0
    from_cache: bool = False
    ocr_applied: bool = False
    message: str = ""


class CacheClearResponse(BaseModel):
    """Respuesta al limpiar caché."""
    success: bool
    message: str


@router.get("/stats", response_model=OCRStatsResponse)
async def get_ocr_stats():
    """
    Obtiene estadísticas del servicio OCR y su caché.
    
    Retorna información sobre:
    - Estado del caché (habilitado/deshabilitado)
    - Número de PDFs en caché
    - Tamaño total del caché
    - Directorio de caché
    """
    try:
        service = get_ocr_service()
        stats = service.get_cache_stats()
        
        return OCRStatsResponse(
            cache_enabled=service.cache_enabled,
            total_entries=stats.get("total_entries", 0),
            total_size_mb=stats.get("total_size_mb", 0),
            cache_dir=stats.get("cache_dir", ""),
            service_available=True
        )
    except Exception as e:
        logger.error(f"Error obteniendo stats OCR: {e}")
        return OCRStatsResponse(
            cache_enabled=False,
            service_available=False
        )


@router.post("/clear-cache", response_model=CacheClearResponse)
async def clear_ocr_cache():
    """
    Limpia el caché de PDFs procesados con OCR.
    
    ⚠️ ADVERTENCIA: Esto eliminará todos los PDFs pre-procesados
    y el próximo procesamiento será más lento.
    """
    try:
        service = get_ocr_service()
        service.clear_cache()
        
        logger.info("Caché de OCR limpiado por solicitud de usuario")
        
        return CacheClearResponse(
            success=True,
            message="Caché de OCR limpiado exitosamente"
        )
    except Exception as e:
        logger.error(f"Error limpiando caché OCR: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error limpiando caché: {str(e)}"
        )


@router.post("/preprocess", response_model=OCRPreprocessResponse)
async def preprocess_pdf(
    file: UploadFile = File(...),
    force_ocr: bool = False,
    quality: str = "standard"
):
    """
    Pre-procesa un PDF con OCR para agregarlo al caché.
    
    Útil para pre-procesar PDFs antes de usarlos en búsquedas,
    reduciendo el tiempo de espera posterior.
    
    Args:
        file: Archivo PDF a procesar
        force_ocr: Forzar OCR incluso si el PDF tiene texto
        quality: Calidad del OCR (fast, standard, high)
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Solo se aceptan archivos PDF"
        )
    
    try:
        # Mapear calidad
        quality_map = {
            "fast": OCRQuality.FAST,
            "standard": OCRQuality.STANDARD,
            "high": OCRQuality.HIGH
        }
        ocr_quality = quality_map.get(quality.lower(), OCRQuality.STANDARD)
        
        # Leer PDF
        pdf_bytes = await file.read()
        
        # Procesar con OCR
        service = get_ocr_service()
        result = service.process_pdf(
            pdf_bytes,
            quality=ocr_quality,
            force_ocr=force_ocr
        )
        
        logger.info(
            f"PDF preprocesado: {file.filename}, "
            f"tiempo={result.processing_time_ms:.0f}ms, "
            f"palabras={result.total_words}"
        )
        
        return OCRPreprocessResponse(
            success=True,
            pdf_hash=result.pdf_hash,
            document_type=result.document_type.value,
            total_pages=len(result.pages),
            total_words=result.total_words,
            processing_time_ms=result.processing_time_ms,
            from_cache=result.from_cache,
            ocr_applied=result.ocr_applied,
            message=f"PDF procesado exitosamente en {result.processing_time_ms:.0f}ms"
        )
        
    except Exception as e:
        logger.error(f"Error preprocesando PDF: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando PDF: {str(e)}"
        )


@router.get("/health")
async def ocr_health_check():
    """
    Verifica el estado de salud del servicio OCR.
    
    Comprueba:
    - Disponibilidad del servicio
    - Disponibilidad de OCRmyPDF
    - Estado del caché
    """
    import subprocess
    
    health = {
        "status": "healthy",
        "service_available": True,
        "ocrmypdf_available": False,
        "tesseract_available": False,
        "cache_available": False,
        "details": {}
    }
    
    # Verificar OCRmyPDF
    try:
        result = subprocess.run(
            ["ocrmypdf", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            health["ocrmypdf_available"] = True
            health["details"]["ocrmypdf_version"] = result.stdout.strip()
    except Exception as e:
        health["details"]["ocrmypdf_error"] = str(e)
    
    # Verificar Tesseract
    try:
        result = subprocess.run(
            ["tesseract", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            health["tesseract_available"] = True
            version_line = result.stdout.split('\n')[0]
            health["details"]["tesseract_version"] = version_line
    except Exception as e:
        health["details"]["tesseract_error"] = str(e)
    
    # Verificar caché
    try:
        service = get_ocr_service()
        if service.cache:
            health["cache_available"] = True
            stats = service.get_cache_stats()
            health["details"]["cache_stats"] = stats
    except Exception as e:
        health["details"]["cache_error"] = str(e)
    
    # Determinar estado general
    if not health["ocrmypdf_available"] and not health["tesseract_available"]:
        health["status"] = "degraded"
    elif not health["ocrmypdf_available"]:
        health["status"] = "degraded"
        health["details"]["warning"] = "OCRmyPDF no disponible, usando fallback a Tesseract"
    
    return health

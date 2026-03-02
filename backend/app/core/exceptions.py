"""
Excepciones personalizadas y manejadores de errores.
"""

from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from loguru import logger


class ManifestoCrossException(Exception):
    """Excepción base para ManifestoCross."""
    
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class DocumentoNoEncontrado(ManifestoCrossException):
    """Documento no encontrado en el sistema."""
    
    def __init__(self, documento_id: int):
        super().__init__(
            message=f"Documento con ID {documento_id} no encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"documento_id": documento_id},
        )


class CodigoNoEncontrado(ManifestoCrossException):
    """Código no encontrado."""
    
    def __init__(self, codigo_id: int):
        super().__init__(
            message=f"Código con ID {codigo_id} no encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"codigo_id": codigo_id},
        )


class BusquedaNoEncontrada(ManifestoCrossException):
    """Búsqueda no encontrada."""
    
    def __init__(self, busqueda_id: int):
        super().__init__(
            message=f"Búsqueda con ID {busqueda_id} no encontrada",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"busqueda_id": busqueda_id},
        )


class ArchivoInvalido(ManifestoCrossException):
    """Archivo inválido o no soportado."""
    
    def __init__(self, mensaje: str, filename: Optional[str] = None):
        super().__init__(
            message=mensaje,
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"filename": filename} if filename else {},
        )


class ArchivoMuyGrande(ManifestoCrossException):
    """Archivo excede el tamaño máximo permitido."""
    
    def __init__(self, size: int, max_size: int):
        super().__init__(
            message=f"El archivo ({size / 1024 / 1024:.2f} MB) excede el tamaño máximo permitido ({max_size / 1024 / 1024:.2f} MB)",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            details={"size": size, "max_size": max_size},
        )


class ErrorProcesamiento(ManifestoCrossException):
    """Error durante el procesamiento del documento."""
    
    def __init__(self, mensaje: str, documento_id: Optional[int] = None):
        super().__init__(
            message=mensaje,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details={"documento_id": documento_id} if documento_id else {},
        )


class ErrorElasticSearch(ManifestoCrossException):
    """Error de conexión o consulta a ElasticSearch."""
    
    def __init__(self, mensaje: str):
        super().__init__(
            message=f"Error de ElasticSearch: {mensaje}",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class ErrorMinIO(ManifestoCrossException):
    """Error de conexión o operación con MinIO."""
    
    def __init__(self, mensaje: str):
        super().__init__(
            message=f"Error de almacenamiento: {mensaje}",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class CredencialesInvalidas(ManifestoCrossException):
    """Credenciales de autenticación inválidas."""
    
    def __init__(self):
        super().__init__(
            message="Credenciales inválidas",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class PermisosDenegados(ManifestoCrossException):
    """Usuario no tiene permisos para esta acción."""
    
    def __init__(self, accion: str):
        super().__init__(
            message=f"No tienes permisos para: {accion}",
            status_code=status.HTTP_403_FORBIDDEN,
            details={"accion": accion},
        )


# ============================================
# Manejadores de excepciones
# ============================================

async def manifestocross_exception_handler(
    request: Request,
    exc: ManifestoCrossException,
) -> JSONResponse:
    """Manejador para excepciones de ManifestoCross."""
    logger.error(f"ManifestoCrossException: {exc.message} - Details: {exc.details}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.message,
            "details": exc.details,
            "path": str(request.url),
        },
    )


async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    """Manejador para HTTPException de FastAPI."""
    logger.warning(f"HTTPException: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "path": str(request.url),
        },
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Manejador para excepciones genéricas no capturadas."""
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "Error interno del servidor",
            "path": str(request.url),
        },
    )

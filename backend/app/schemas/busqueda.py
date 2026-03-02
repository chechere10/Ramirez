"""
Schemas Pydantic para búsquedas.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class EstadoBusqueda(str, Enum):
    """Estados de la búsqueda."""
    PENDIENTE = "pendiente"
    PROCESANDO = "procesando"
    COMPLETADO = "completado"
    ERROR = "error"


class EstadoResultado(str, Enum):
    """Estado del resultado de un código."""
    ENCONTRADO = "encontrado"
    NO_ENCONTRADO = "no_encontrado"
    PARCIAL = "parcial"  # Coincidencia parcial/fuzzy


# ============================================
# Schemas de entrada (Create)
# ============================================

class BusquedaCreate(BaseModel):
    """Schema para crear una búsqueda."""
    codigos: List[str] = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Lista de códigos a buscar"
    )
    manifiesto_ids: Optional[List[int]] = Field(
        None,
        description="IDs de los manifiestos donde buscar (opcional, si no se especifica busca en todos)"
    )
    busqueda_fuzzy: bool = Field(
        False,
        description="Activar búsqueda tolerante a errores tipográficos"
    )
    normalizar_codigos: bool = Field(
        True,
        description="Normalizar códigos antes de buscar (quitar espacios, guiones)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "codigos": ["ABC-123", "DEF-456", "GHI-789"],
                "manifiesto_ids": [1, 2, 3],
                "busqueda_fuzzy": False,
                "normalizar_codigos": True
            }
        }


# ============================================
# Schemas de salida (Response)
# ============================================

class CodigoResultado(BaseModel):
    """Resultado de búsqueda para un código individual."""
    codigo_original: str = Field(..., description="Código tal como fue enviado")
    codigo_normalizado: str = Field(..., description="Código normalizado")
    estado: EstadoResultado
    encontrado_en: List[dict] = Field(
        default=[],
        description="Lista de ubicaciones donde se encontró"
    )
    frecuencia: int = Field(0, description="Número de veces encontrado")
    similares: Optional[List[str]] = Field(
        None,
        description="Códigos similares encontrados (si búsqueda fuzzy)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "codigo_original": "ABC-123",
                "codigo_normalizado": "ABC123",
                "estado": "encontrado",
                "encontrado_en": [
                    {
                        "documento_id": 1,
                        "documento_nombre": "manifiesto_001.pdf",
                        "pagina": 5,
                        "contexto": "...contenedor ABC-123 llegó al puerto..."
                    }
                ],
                "frecuencia": 1,
                "similares": None
            }
        }


class BusquedaResponse(BaseModel):
    """Schema de respuesta para una búsqueda."""
    id: int
    codigos_buscados: int
    codigos_encontrados: int
    codigos_no_encontrados: int
    estado: EstadoBusqueda
    manifiesto_id: Optional[int] = None
    busqueda_fuzzy: bool = False
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    mensaje: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "codigos_buscados": 100,
                "codigos_encontrados": 85,
                "codigos_no_encontrados": 15,
                "estado": "completado",
                "manifiesto_id": 1,
                "busqueda_fuzzy": False,
                "created_at": "2026-01-20T10:00:00",
                "completed_at": "2026-01-20T10:00:05",
                "mensaje": "Búsqueda completada exitosamente"
            }
        }


class ResultadoBusquedaResponse(BaseModel):
    """Schema de respuesta con resultados detallados."""
    busqueda_id: int
    resultados: List[CodigoResultado]
    resumen: dict = Field(
        default={},
        description="Resumen estadístico de la búsqueda"
    )
    total: int
    skip: int
    limit: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "busqueda_id": 1,
                "resultados": [],
                "resumen": {
                    "total_buscados": 100,
                    "encontrados": 85,
                    "no_encontrados": 15,
                    "porcentaje_encontrados": 85.0
                },
                "total": 100,
                "skip": 0,
                "limit": 100
            }
        }


class BusquedaListResponse(BaseModel):
    """Schema para lista paginada de búsquedas."""
    items: List[BusquedaResponse]
    total: int
    skip: int
    limit: int

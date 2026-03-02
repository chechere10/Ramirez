"""
Schemas Pydantic para documentos.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class TipoDocumento(str, Enum):
    """Tipos de documento soportados."""
    MANIFIESTO = "manifiesto"
    FACTURA = "factura"


class EstadoDocumento(str, Enum):
    """Estados de procesamiento del documento."""
    PENDIENTE = "pendiente"
    PROCESANDO = "procesando"
    COMPLETADO = "completado"
    ERROR = "error"


# ============================================
# Schemas de entrada (Create/Update)
# ============================================

class DocumentoCreate(BaseModel):
    """Schema para crear un documento."""
    tipo: TipoDocumento = Field(..., description="Tipo de documento")
    descripcion: Optional[str] = Field(None, max_length=500, description="Descripción opcional")
    
    class Config:
        json_schema_extra = {
            "example": {
                "tipo": "manifiesto",
                "descripcion": "Manifiesto de carga enero 2026"
            }
        }


class DocumentoUpdate(BaseModel):
    """Schema para actualizar un documento."""
    descripcion: Optional[str] = Field(None, max_length=500)
    estado: Optional[EstadoDocumento] = None


# ============================================
# Schemas de salida (Response)
# ============================================

class DocumentoBase(BaseModel):
    """Schema base para documento."""
    id: int
    nombre: str
    tipo: TipoDocumento
    descripcion: Optional[str] = None
    estado: EstadoDocumento
    tamaño: int = Field(..., description="Tamaño en bytes")
    paginas: Optional[int] = Field(None, description="Número de páginas")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DocumentoResponse(DocumentoBase):
    """Schema de respuesta para documento."""
    mensaje: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "nombre": "manifiesto_001.pdf",
                "tipo": "manifiesto",
                "descripcion": "Manifiesto de carga enero 2026",
                "estado": "completado",
                "tamaño": 1024000,
                "paginas": 50,
                "created_at": "2026-01-20T10:00:00",
                "updated_at": "2026-01-20T10:05:00",
                "mensaje": "Documento procesado exitosamente"
            }
        }


class CodigoEnDocumento(BaseModel):
    """Schema para código encontrado en documento."""
    id: int
    codigo: str
    codigo_normalizado: str
    pagina: int
    posicion_x: Optional[float] = None
    posicion_y: Optional[float] = None
    contexto: Optional[str] = Field(None, description="Texto alrededor del código")
    
    class Config:
        from_attributes = True


class DocumentoWithCodigos(DocumentoBase):
    """Schema de documento con lista de códigos extraídos."""
    codigos: List[CodigoEnDocumento] = []
    total_codigos: int = 0
    
    class Config:
        from_attributes = True


class DocumentoListResponse(BaseModel):
    """Schema para lista paginada de documentos."""
    items: List[DocumentoResponse]
    total: int
    skip: int
    limit: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 0,
                "skip": 0,
                "limit": 100
            }
        }

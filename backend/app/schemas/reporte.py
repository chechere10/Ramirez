"""
Schemas Pydantic para reportes.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class EstadoReporte(str, Enum):
    """Estados del reporte."""
    PENDIENTE = "pendiente"
    GENERANDO = "generando"
    COMPLETADO = "completado"
    ERROR = "error"


class ColorResaltado(str, Enum):
    """Colores disponibles para resaltar."""
    AMARILLO = "amarillo"
    VERDE = "verde"
    AZUL = "azul"
    ROJO = "rojo"
    NARANJA = "naranja"
    ROSA = "rosa"


# ============================================
# Schemas de entrada (Create)
# ============================================

class ReporteCreate(BaseModel):
    """Schema para crear un reporte."""
    busqueda_id: int = Field(..., description="ID de la búsqueda base para el reporte")
    incluir_pdf: bool = Field(True, description="Generar PDF con resaltados")
    incluir_excel: bool = Field(True, description="Generar archivo Excel")
    incluir_csv: bool = Field(False, description="Generar archivo CSV")
    color_resaltado: ColorResaltado = Field(
        ColorResaltado.AMARILLO,
        description="Color para resaltar códigos encontrados"
    )
    incluir_no_encontrados: bool = Field(
        True,
        description="Incluir códigos no encontrados en el reporte"
    )
    agregar_marca_agua: bool = Field(
        True,
        description="Agregar marca de agua 'Procesado' al PDF"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "busqueda_id": 1,
                "incluir_pdf": True,
                "incluir_excel": True,
                "incluir_csv": False,
                "color_resaltado": "amarillo",
                "incluir_no_encontrados": True,
                "agregar_marca_agua": True
            }
        }


# ============================================
# Schemas de salida (Response)
# ============================================

class ReporteResponse(BaseModel):
    """Schema de respuesta para un reporte."""
    id: int
    busqueda_id: int
    estado: EstadoReporte
    pdf_disponible: bool = False
    excel_disponible: bool = False
    csv_disponible: bool = False
    pdf_url: Optional[str] = None
    excel_url: Optional[str] = None
    csv_url: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    mensaje: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "busqueda_id": 1,
                "estado": "completado",
                "pdf_disponible": True,
                "excel_disponible": True,
                "csv_disponible": False,
                "pdf_url": "/api/reportes/1/pdf",
                "excel_url": "/api/reportes/1/excel",
                "csv_url": None,
                "created_at": "2026-01-20T10:05:00",
                "completed_at": "2026-01-20T10:05:30",
                "mensaje": "Reporte generado exitosamente"
            }
        }


class ReporteListResponse(BaseModel):
    """Schema para lista paginada de reportes."""
    items: List[ReporteResponse]
    total: int
    skip: int
    limit: int

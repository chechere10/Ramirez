"""
Modelo de Reporte generado.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.schemas.reporte import ColorResaltado, EstadoReporte

if TYPE_CHECKING:
    from app.models.busqueda import Busqueda


class Reporte(BaseModel):
    """
    Modelo de Reporte.
    Almacena información de reportes generados.
    """
    
    __tablename__ = "reportes"
    
    # Campos principales
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Estado del reporte
    estado: Mapped[EstadoReporte] = mapped_column(
        Enum(EstadoReporte, name="estado_reporte"),
        default=EstadoReporte.PENDIENTE,
        nullable=False,
        index=True,
    )
    
    # Configuración
    color_resaltado: Mapped[ColorResaltado] = mapped_column(
        Enum(ColorResaltado, name="color_resaltado"),
        default=ColorResaltado.AMARILLO,
        nullable=False,
    )
    incluir_no_encontrados: Mapped[bool] = mapped_column(Boolean, default=True)
    agregar_marca_agua: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Archivos generados
    pdf_disponible: Mapped[bool] = mapped_column(Boolean, default=False)
    excel_disponible: Mapped[bool] = mapped_column(Boolean, default=False)
    csv_disponible: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Rutas de almacenamiento
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    excel_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    csv_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Timestamps de procesamiento
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Mensaje de error si aplica
    error_mensaje: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relación con búsqueda
    busqueda_id: Mapped[int] = mapped_column(
        ForeignKey("busquedas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    def __repr__(self) -> str:
        return f"<Reporte(id={self.id}, busqueda_id={self.busqueda_id}, estado='{self.estado}')>"

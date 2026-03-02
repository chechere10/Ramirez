"""
Modelo de Búsqueda y sus resultados.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.schemas.busqueda import EstadoBusqueda, EstadoResultado

if TYPE_CHECKING:
    from app.models.documento import Documento
    from app.models.usuario import Usuario


class Busqueda(BaseModel):
    """
    Modelo de Búsqueda.
    Representa una sesión de búsqueda de códigos.
    """
    
    __tablename__ = "busquedas"
    
    # Campos principales
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Estado de la búsqueda
    estado: Mapped[EstadoBusqueda] = mapped_column(
        Enum(EstadoBusqueda, name="estado_busqueda"),
        default=EstadoBusqueda.PENDIENTE,
        nullable=False,
        index=True,
    )
    
    # Configuración de la búsqueda
    busqueda_fuzzy: Mapped[bool] = mapped_column(Boolean, default=False)
    normalizar_codigos: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Estadísticas
    codigos_buscados: Mapped[int] = mapped_column(Integer, default=0)
    codigos_encontrados: Mapped[int] = mapped_column(Integer, default=0)
    codigos_no_encontrados: Mapped[int] = mapped_column(Integer, default=0)
    codigos_parciales: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps de procesamiento
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Mensaje de error si aplica
    error_mensaje: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relación con manifiesto (opcional, si se busca en uno específico)
    manifiesto_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("documentos.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Relación con usuario (para auditoría)
    usuario_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    usuario: Mapped[Optional["Usuario"]] = relationship(
        "Usuario",
        back_populates="busquedas",
    )
    
    # Relación con resultados
    resultados: Mapped[List["ResultadoBusqueda"]] = relationship(
        "ResultadoBusqueda",
        back_populates="busqueda",
        cascade="all, delete-orphan",
    )
    
    @property
    def porcentaje_encontrados(self) -> float:
        """Calcula el porcentaje de códigos encontrados."""
        if self.codigos_buscados == 0:
            return 0.0
        return (self.codigos_encontrados / self.codigos_buscados) * 100
    
    def __repr__(self) -> str:
        return (
            f"<Busqueda(id={self.id}, estado='{self.estado}', "
            f"buscados={self.codigos_buscados}, encontrados={self.codigos_encontrados})>"
        )


class ResultadoBusqueda(BaseModel):
    """
    Modelo de Resultado de Búsqueda.
    Almacena el resultado para cada código buscado.
    """
    
    __tablename__ = "resultados_busqueda"
    
    # Campos principales
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Código buscado
    codigo_original: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    codigo_normalizado: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    # Estado del resultado
    estado: Mapped[EstadoResultado] = mapped_column(
        Enum(EstadoResultado, name="estado_resultado"),
        nullable=False,
        index=True,
    )
    
    # Frecuencia de aparición
    frecuencia: Mapped[int] = mapped_column(Integer, default=0)
    
    # Ubicaciones encontradas (JSON array)
    ubicaciones: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Array de {documento_id, pagina, contexto}",
    )
    
    # Códigos similares (para búsqueda fuzzy)
    similares: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Array de códigos similares encontrados",
    )
    
    # Relación con búsqueda
    busqueda_id: Mapped[int] = mapped_column(
        ForeignKey("busquedas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    busqueda: Mapped["Busqueda"] = relationship(
        "Busqueda",
        back_populates="resultados",
    )
    
    def __repr__(self) -> str:
        return (
            f"<ResultadoBusqueda(id={self.id}, codigo='{self.codigo_original}', "
            f"estado='{self.estado}', frecuencia={self.frecuencia})>"
        )

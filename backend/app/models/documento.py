"""
Modelo de Documento (manifiestos y facturas).
"""

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import BigInteger, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.schemas.documento import EstadoDocumento, TipoDocumento

if TYPE_CHECKING:
    from app.models.codigo import Codigo
    from app.models.usuario import Usuario


class Documento(BaseModel):
    """
    Modelo de Documento.
    Representa un PDF subido (manifiesto o factura).
    """
    
    __tablename__ = "documentos"
    
    # Campos principales
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Tipo y estado
    tipo: Mapped[TipoDocumento] = mapped_column(
        Enum(TipoDocumento, name="tipo_documento"),
        nullable=False,
        index=True,
    )
    estado: Mapped[EstadoDocumento] = mapped_column(
        Enum(EstadoDocumento, name="estado_documento"),
        default=EstadoDocumento.PENDIENTE,
        nullable=False,
        index=True,
    )
    
    # Metadatos del archivo
    tamaño: Mapped[int] = mapped_column(BigInteger, nullable=False)  # Tamaño en bytes
    paginas: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Almacenamiento
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # SHA-256
    
    # Procesamiento
    texto_extraido: Mapped[bool] = mapped_column(default=False)
    ocr_aplicado: Mapped[bool] = mapped_column(default=False)
    error_procesamiento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relación con usuario (opcional, para auditoría)
    usuario_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    usuario: Mapped[Optional["Usuario"]] = relationship(
        "Usuario",
        back_populates="documentos",
    )
    
    # Relación con códigos extraídos
    codigos: Mapped[List["Codigo"]] = relationship(
        "Codigo",
        back_populates="documento",
        cascade="all, delete-orphan",
    )
    
    @property
    def total_codigos(self) -> int:
        """Retorna el total de códigos extraídos del documento."""
        return len(self.codigos) if self.codigos else 0
    
    def __repr__(self) -> str:
        return f"<Documento(id={self.id}, nombre='{self.nombre}', tipo='{self.tipo}', estado='{self.estado}')>"

"""
Modelo de Código extraído de documentos.
"""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.documento import Documento


class Codigo(BaseModel):
    """
    Modelo de Código.
    Representa un código extraído de un documento (manifiesto).
    """
    
    __tablename__ = "codigos"
    
    # Campos principales
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    codigo_normalizado: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    # Ubicación en el documento
    pagina: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    linea: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Coordenadas para resaltado
    posicion_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    posicion_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ancho: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    alto: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Contexto
    contexto: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Texto alrededor del código para contexto",
    )
    
    # Relación con documento
    documento_id: Mapped[int] = mapped_column(
        ForeignKey("documentos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    documento: Mapped["Documento"] = relationship(
        "Documento",
        back_populates="codigos",
    )
    
    def __repr__(self) -> str:
        return f"<Codigo(id={self.id}, codigo='{self.codigo}', pagina={self.pagina})>"
    
    @staticmethod
    def normalizar_codigo(codigo: str) -> str:
        """
        Normaliza un código removiendo espacios, guiones y convirtiendo a mayúsculas.
        
        Args:
            codigo: Código original
            
        Returns:
            Código normalizado
        """
        return codigo.upper().replace(" ", "").replace("-", "").replace("_", "")

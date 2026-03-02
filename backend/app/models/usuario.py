"""
Modelo de Usuario para autenticación y auditoría.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.schemas.usuario import RolUsuario

if TYPE_CHECKING:
    from app.models.documento import Documento
    from app.models.busqueda import Busqueda


class Usuario(BaseModel):
    """
    Modelo de Usuario.
    Almacena información de usuarios para autenticación y auditoría.
    """
    
    __tablename__ = "usuarios"
    
    # Campos principales
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Rol y estado
    rol: Mapped[RolUsuario] = mapped_column(
        Enum(RolUsuario, name="rol_usuario"),
        default=RolUsuario.USUARIO,
        nullable=False,
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Timestamps adicionales
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relaciones
    documentos: Mapped[List["Documento"]] = relationship(
        "Documento",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    busquedas: Mapped[List["Busqueda"]] = relationship(
        "Busqueda",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Usuario(id={self.id}, email='{self.email}', rol='{self.rol}')>"

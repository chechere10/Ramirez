"""
Modelo base con campos comunes para todos los modelos.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TimestampMixin:
    """Mixin para campos de timestamp (created_at, updated_at)."""
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class BaseModel(Base, TimestampMixin):
    """
    Modelo base abstracto con campos comunes.
    Todos los modelos heredan de aquí.
    """
    
    __abstract__ = True
    
    def to_dict(self) -> dict[str, Any]:
        """Convertir modelo a diccionario."""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

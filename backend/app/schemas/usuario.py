"""
Schemas Pydantic para usuarios.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RolUsuario(str, Enum):
    """Roles de usuario disponibles."""
    ADMIN = "admin"
    USUARIO = "usuario"
    VIEWER = "viewer"


# ============================================
# Schemas de entrada (Create/Login)
# ============================================

class UsuarioCreate(BaseModel):
    """Schema para registrar un usuario."""
    email: EmailStr = Field(..., description="Email del usuario")
    password: str = Field(..., min_length=8, description="Contraseña (mínimo 8 caracteres)")
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre completo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "usuario@ejemplo.com",
                "password": "contraseña_segura_123",
                "nombre": "Juan Pérez"
            }
        }


class UsuarioLogin(BaseModel):
    """Schema para iniciar sesión."""
    email: EmailStr = Field(..., description="Email del usuario")
    password: str = Field(..., description="Contraseña")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "usuario@ejemplo.com",
                "password": "contraseña_segura_123"
            }
        }


class UsuarioUpdate(BaseModel):
    """Schema para actualizar usuario."""
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    password: Optional[str] = Field(None, min_length=8)


# ============================================
# Schemas de salida (Response)
# ============================================

class UsuarioResponse(BaseModel):
    """Schema de respuesta para usuario."""
    id: int
    email: EmailStr
    nombre: str
    rol: RolUsuario
    activo: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    mensaje: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "usuario@ejemplo.com",
                "nombre": "Juan Pérez",
                "rol": "usuario",
                "activo": True,
                "created_at": "2026-01-20T10:00:00",
                "last_login": "2026-01-20T15:30:00",
                "mensaje": None
            }
        }


class TokenResponse(BaseModel):
    """Schema de respuesta para token JWT."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Segundos hasta expiración")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800
            }
        }

"""
Endpoints para gestión de usuarios (autenticación y auditoría).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_optional, get_db
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioLogin,
    TokenResponse,
)

router = APIRouter()


@router.post(
    "/registro",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar usuario",
    description="Registra un nuevo usuario en el sistema.",
)
async def registrar_usuario(
    usuario: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Registrar un nuevo usuario.
    
    - **email**: Email del usuario (único)
    - **password**: Contraseña (mínimo 8 caracteres)
    - **nombre**: Nombre completo
    """
    # TODO: Implementar registro de usuario
    return {
        "id": 1,  # Placeholder
        "email": usuario.email,
        "nombre": usuario.nombre,
        "rol": "usuario",
        "activo": True,
        "mensaje": "Usuario registrado exitosamente.",
    }


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Iniciar sesión",
    description="Autentica un usuario y retorna token JWT.",
)
async def login(
    credentials: UsuarioLogin,
    db: AsyncSession = Depends(get_db),
):
    """
    Iniciar sesión con email y contraseña.
    Retorna token JWT para autenticación.
    """
    # TODO: Implementar autenticación
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
    )


@router.get(
    "/me",
    response_model=UsuarioResponse,
    summary="Usuario actual",
    description="Obtiene información del usuario autenticado.",
)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Obtener información del usuario actualmente autenticado.
    """
    # TODO: Implementar consulta a DB
    return {
        "id": current_user.get("id"),
        "email": current_user.get("email"),
        "nombre": "Usuario",
        "rol": "usuario",
        "activo": True,
    }


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cerrar sesión",
    description="Invalida el token actual del usuario.",
)
async def logout(
    current_user: dict = Depends(get_current_user),
):
    """
    Cerrar sesión (invalidar token).
    """
    # TODO: Implementar invalidación de token (blacklist)
    return None

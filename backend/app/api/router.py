"""
Router principal que agrupa todos los endpoints de la API.
"""

from fastapi import APIRouter

from app.api.endpoints import busqueda, documentos, highlight, ocr, reportes, usuarios
from app.api import tareas, sync

# Router principal de la API
api_router = APIRouter()

# Incluir routers de cada módulo
api_router.include_router(
    documentos.router,
    prefix="/documentos",
    tags=["Documentos"],
)

api_router.include_router(
    busqueda.router,
    prefix="/busqueda",
    tags=["Búsqueda"],
)

api_router.include_router(
    reportes.router,
    prefix="/reportes",
    tags=["Reportes"],
)

api_router.include_router(
    highlight.router,
    prefix="/highlight",
    tags=["Resaltado PDF"],
)

api_router.include_router(
    ocr.router,
    prefix="/ocr",
    tags=["OCR Service"],
)

api_router.include_router(
    usuarios.router,
    prefix="/usuarios",
    tags=["Usuarios"],
)

api_router.include_router(
    tareas.router,
    tags=["Tareas Asíncronas"],
)

# Sincronización con MinIO
api_router.include_router(
    sync.router,
    tags=["Sincronización"],
)

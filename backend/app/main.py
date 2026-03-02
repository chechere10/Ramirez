"""
ManifestoCross Backend - Aplicación Principal
Sistema de Gestión de Manifiestos y Cruce con Facturas
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import (
    ManifestoCrossException,
    generic_exception_handler,
    http_exception_handler,
    manifestocross_exception_handler,
)
from app.core.middleware import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestión del ciclo de vida de la aplicación.
    Startup y Shutdown events.
    """
    # Startup
    logger.info(f"🚀 Iniciando {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"📍 Servidor en: http://localhost:{settings.PORT}")
    logger.info(f"📚 Documentación en: http://localhost:{settings.PORT}/docs")
    
    # Inicializar conexiones si es necesario
    # await init_db()  # Descomentar cuando los modelos estén listos
    
    yield
    
    # Shutdown
    logger.info("👋 Cerrando aplicación...")


# Crear aplicación FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="API para el Sistema de Gestión de Manifiestos y Cruce con Facturas",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ============================================
# Middlewares
# ============================================

# Middleware de logging
app.add_middleware(LoggingMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Exception Handlers
# ============================================

app.add_exception_handler(ManifestoCrossException, manifestocross_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# ============================================
# Routers
# ============================================

# Incluir router principal de API
app.include_router(api_router, prefix="/api")


# ============================================
# Endpoints Raíz
# ============================================

@app.get("/", tags=["Root"])
async def root() -> dict:
    """Endpoint raíz - Información básica de la API."""
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "message": "Bienvenido a ManifestoCross API",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Health check del servicio."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
    }

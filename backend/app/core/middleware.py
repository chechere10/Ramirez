"""
Middlewares personalizados para la aplicación.
"""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware para logging de todas las requests.
    Registra: método, path, tiempo de respuesta, status code.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generar ID único para la request
        request_id = str(uuid.uuid4())[:8]
        
        # Agregar request_id al state para uso posterior
        request.state.request_id = request_id
        
        # Tiempo de inicio
        start_time = time.time()
        
        # Info de la request
        method = request.method
        path = request.url.path
        query_params = str(request.query_params) if request.query_params else ""
        client_ip = request.client.host if request.client else "unknown"
        
        # Log de entrada
        logger.info(
            f"[{request_id}] ▶ {method} {path}"
            f"{f'?{query_params}' if query_params else ''}"
            f" - IP: {client_ip}"
        )
        
        try:
            # Procesar request
            response = await call_next(request)
            
            # Calcular tiempo de respuesta
            process_time = (time.time() - start_time) * 1000  # ms
            
            # Agregar headers de respuesta
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
            
            # Determinar emoji según status code
            if response.status_code < 300:
                emoji = "✅"
            elif response.status_code < 400:
                emoji = "↪️"
            elif response.status_code < 500:
                emoji = "⚠️"
            else:
                emoji = "❌"
            
            # Log de salida
            logger.info(
                f"[{request_id}] {emoji} {method} {path} "
                f"→ {response.status_code} ({process_time:.2f}ms)"
            )
            
            return response
            
        except Exception as exc:
            # Calcular tiempo incluso en error
            process_time = (time.time() - start_time) * 1000
            
            logger.error(
                f"[{request_id}] ❌ {method} {path} "
                f"→ Exception: {type(exc).__name__}: {exc} ({process_time:.2f}ms)"
            )
            raise


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware para asegurar que cada request tenga un ID único.
    Si el cliente envía X-Request-ID, se usa ese; si no, se genera uno.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Verificar si viene un request_id del cliente
        request_id = request.headers.get("X-Request-ID")
        
        if not request_id:
            request_id = str(uuid.uuid4())
        
        # Guardar en state
        request.state.request_id = request_id
        
        # Procesar request
        response = await call_next(request)
        
        # Agregar header de respuesta
        response.headers["X-Request-ID"] = request_id
        
        return response

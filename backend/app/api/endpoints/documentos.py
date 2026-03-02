"""
Endpoints para gestión de documentos (manifiestos y facturas).
"""

import hashlib
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from loguru import logger
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user_optional, get_db, get_pagination_params
from app.core.config import settings
from app.core.exceptions import ArchivoInvalido, ArchivoMuyGrande
from app.models.documento import Documento
from app.models.codigo import Codigo
from app.schemas.documento import (
    DocumentoCreate,
    DocumentoResponse,
    DocumentoListResponse,
    DocumentoWithCodigos,
    TipoDocumento,
    EstadoDocumento,
)

router = APIRouter()

# Tipos de archivo permitidos
ALLOWED_CONTENT_TYPES = [
    "application/pdf",
]

# Directorios de almacenamiento
STORAGE_BASE = Path("/app/storage")
UPLOADS_DIR = STORAGE_BASE / "uploads"
PROCESSED_DIR = STORAGE_BASE / "processed"

# Crear directorios si no existen
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def generate_unique_filename(original_name: str) -> str:
    """Genera un nombre único para el archivo."""
    ext = Path(original_name).suffix
    unique_id = uuid.uuid4().hex[:12]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in Path(original_name).stem)[:50]
    return f"{timestamp}_{safe_name}_{unique_id}{ext}"


def calculate_checksum(file_content: bytes) -> str:
    """Calcula el checksum SHA-256 del archivo."""
    return hashlib.sha256(file_content).hexdigest()


@router.post(
    "/upload",
    response_model=DocumentoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Subir documento",
    description="Sube un documento PDF (manifiesto o factura) para procesamiento.",
)
async def upload_documento(
    file: UploadFile = File(..., description="Archivo PDF a subir"),
    tipo: str = Query(..., pattern="^(manifiesto|factura)$", description="Tipo: manifiesto o factura"),
    descripcion: Optional[str] = Query(None, description="Descripción opcional del documento"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Subir un documento PDF para procesamiento.
    
    - **file**: Archivo PDF
    - **tipo**: Tipo de documento (manifiesto o factura)
    - **descripcion**: Descripción opcional
    """
    # Validar tipo de archivo
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ArchivoInvalido(
            f"Tipo de archivo no permitido: {file.content_type}. Solo se aceptan PDFs.",
            filename=file.filename,
        )
    
    # Leer contenido del archivo
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise ArchivoMuyGrande(file_size, settings.MAX_UPLOAD_SIZE)
    
    # Generar nombre único y guardar archivo
    unique_name = generate_unique_filename(file.filename or "documento.pdf")
    tipo_enum = TipoDocumento(tipo)
    storage_subdir = "manifiestos" if tipo_enum == TipoDocumento.MANIFIESTO else "facturas"
    storage_path = UPLOADS_DIR / storage_subdir / unique_name
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Guardar archivo en disco
    with open(storage_path, "wb") as f:
        f.write(file_content)
    
    logger.info(f"Archivo guardado: {storage_path}")
    
    # Calcular checksum
    checksum = calculate_checksum(file_content)
    
    # Crear registro en DB
    documento = Documento(
        nombre=unique_name,
        nombre_original=file.filename or "documento.pdf",
        tipo=tipo_enum,
        estado=EstadoDocumento.PENDIENTE,
        tamaño=file_size,
        descripcion=descripcion,
        storage_path=str(storage_path),
        content_type=file.content_type or "application/pdf",
        checksum=checksum,
    )
    
    db.add(documento)
    await db.commit()
    await db.refresh(documento)
    
    logger.info(f"Documento creado en DB: id={documento.id}, nombre={documento.nombre}")
    
    return {
        "id": documento.id,
        "nombre": documento.nombre_original,
        "tipo": documento.tipo.value,
        "descripcion": documento.descripcion,
        "estado": documento.estado.value,
        "tamaño": documento.tamaño,
        "paginas": documento.paginas,
        "created_at": documento.created_at,
        "updated_at": documento.updated_at,
        "mensaje": "Documento subido exitosamente. Listo para procesamiento.",
    }


@router.post(
    "/upload-multiple",
    status_code=status.HTTP_201_CREATED,
    summary="Subir múltiples documentos",
    description="Sube múltiples documentos PDF (manifiestos) para procesamiento.",
)
async def upload_multiple_documentos(
    files: List[UploadFile] = File(..., description="Archivos PDF a subir"),
    tipo: str = Query(..., pattern="^(manifiesto|factura)$", description="Tipo: manifiesto o factura"),
    descripcion: Optional[str] = Query(None, description="Descripción opcional"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Subir múltiples documentos PDF para procesamiento.
    Útil para cargar varios manifiestos a la vez.
    """
    resultados = []
    errores = []
    
    for file in files:
        try:
            # Validar tipo de archivo
            if file.content_type not in ALLOWED_CONTENT_TYPES:
                errores.append({
                    "archivo": file.filename,
                    "error": f"Tipo de archivo no permitido: {file.content_type}"
                })
                continue
            
            # Leer contenido
            file_content = await file.read()
            file_size = len(file_content)
            
            if file_size > settings.MAX_UPLOAD_SIZE:
                errores.append({
                    "archivo": file.filename,
                    "error": f"Archivo muy grande: {file_size} bytes"
                })
                continue
            
            # Generar nombre único y guardar
            unique_name = generate_unique_filename(file.filename or "documento.pdf")
            tipo_enum = TipoDocumento(tipo)
            storage_subdir = "manifiestos" if tipo_enum == TipoDocumento.MANIFIESTO else "facturas"
            storage_path = UPLOADS_DIR / storage_subdir / unique_name
            storage_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(storage_path, "wb") as f:
                f.write(file_content)
            
            checksum = calculate_checksum(file_content)
            
            # Crear registro
            documento = Documento(
                nombre=unique_name,
                nombre_original=file.filename or "documento.pdf",
                tipo=tipo_enum,
                estado=EstadoDocumento.PENDIENTE,
                tamaño=file_size,
                descripcion=descripcion,
                storage_path=str(storage_path),
                content_type=file.content_type or "application/pdf",
                checksum=checksum,
            )
            
            db.add(documento)
            await db.flush()
            
            resultados.append({
                "id": documento.id,
                "nombre": documento.nombre_original,
                "tipo": documento.tipo.value,
                "estado": documento.estado.value,
                "tamaño": documento.tamaño,
            })
            
        except Exception as e:
            logger.error(f"Error subiendo {file.filename}: {e}")
            errores.append({
                "archivo": file.filename,
                "error": str(e)
            })
    
    await db.commit()
    
    return {
        "total_subidos": len(resultados),
        "total_errores": len(errores),
        "documentos": resultados,
        "errores": errores,
        "mensaje": f"Se subieron {len(resultados)} de {len(files)} documentos."
    }


@router.get(
    "",
    response_model=DocumentoListResponse,
    summary="Listar documentos",
    description="Obtiene lista de documentos con filtros opcionales.",
)
async def list_documentos(
    tipo: Optional[str] = Query(None, pattern="^(manifiesto|factura)$"),
    estado: Optional[str] = Query(None),
    pagination: dict = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db),
):
    """
    Listar documentos con filtros opcionales.
    
    - **tipo**: Filtrar por tipo (manifiesto/factura)
    - **estado**: Filtrar por estado de procesamiento
    - **skip**: Número de registros a saltar (paginación)
    - **limit**: Número máximo de registros a retornar
    """
    # Construir query base
    query = select(Documento)
    count_query = select(func.count(Documento.id))
    
    # Aplicar filtros
    if tipo:
        tipo_enum = TipoDocumento(tipo)
        query = query.where(Documento.tipo == tipo_enum)
        count_query = count_query.where(Documento.tipo == tipo_enum)
    
    if estado:
        estado_enum = EstadoDocumento(estado)
        query = query.where(Documento.estado == estado_enum)
        count_query = count_query.where(Documento.estado == estado_enum)
    
    # Contar total
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Aplicar paginación y ordenar por fecha descendente
    query = query.order_by(Documento.created_at.desc())
    query = query.offset(pagination["skip"]).limit(pagination["limit"])
    
    # Ejecutar query
    result = await db.execute(query)
    documentos = result.scalars().all()
    
    items = [
        {
            "id": doc.id,
            "nombre": doc.nombre_original,
            "tipo": doc.tipo.value,
            "descripcion": doc.descripcion,
            "estado": doc.estado.value,
            "tamaño": doc.tamaño,
            "paginas": doc.paginas,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
        }
        for doc in documentos
    ]
    
    return {
        "items": items,
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
    }


@router.get(
    "/{documento_id}",
    response_model=DocumentoResponse,
    summary="Obtener documento",
    description="Obtiene información detallada de un documento.",
)
async def get_documento(
    documento_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Obtener información de un documento por su ID.
    """
    result = await db.execute(
        select(Documento).where(Documento.id == documento_id)
    )
    documento = result.scalar_one_or_none()
    
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con ID {documento_id} no encontrado",
        )
    
    return {
        "id": documento.id,
        "nombre": documento.nombre_original,
        "tipo": documento.tipo.value,
        "descripcion": documento.descripcion,
        "estado": documento.estado.value,
        "tamaño": documento.tamaño,
        "paginas": documento.paginas,
        "created_at": documento.created_at,
        "updated_at": documento.updated_at,
    }


@router.delete(
    "/{documento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar documento",
    description="Elimina un documento y sus datos asociados.",
)
async def delete_documento(
    documento_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_optional),
):
    """
    Eliminar un documento por su ID.
    También elimina códigos asociados y archivo físico.
    """
    result = await db.execute(
        select(Documento).where(Documento.id == documento_id)
    )
    documento = result.scalar_one_or_none()
    
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con ID {documento_id} no encontrado",
        )
    
    # Eliminar archivo físico
    try:
        storage_path = Path(documento.storage_path)
        if storage_path.exists():
            storage_path.unlink()
            logger.info(f"Archivo eliminado: {storage_path}")
    except Exception as e:
        logger.warning(f"No se pudo eliminar el archivo {documento.storage_path}: {e}")
    
    # Eliminar códigos asociados
    await db.execute(
        delete(Codigo).where(Codigo.documento_id == documento_id)
    )
    
    # Eliminar documento
    await db.delete(documento)
    await db.commit()
    
    logger.info(f"Documento eliminado: id={documento_id}")


@router.get(
    "/{documento_id}/download",
    summary="Descargar documento",
    description="Descarga el archivo PDF original.",
)
async def download_documento(
    documento_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Descargar el archivo PDF original de un documento.
    """
    result = await db.execute(
        select(Documento).where(Documento.id == documento_id)
    )
    documento = result.scalar_one_or_none()
    
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con ID {documento_id} no encontrado",
        )
    
    storage_path = Path(documento.storage_path)
    if not storage_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo no encontrado en el almacenamiento",
        )
    
    return FileResponse(
        path=storage_path,
        filename=documento.nombre_original,
        media_type=documento.content_type,
    )


@router.get(
    "/{documento_id}/codigos",
    response_model=DocumentoWithCodigos,
    summary="Listar códigos del documento",
    description="Obtiene todos los códigos extraídos de un documento.",
)
async def get_documento_codigos(
    documento_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Obtener todos los códigos extraídos de un documento.
    """
    result = await db.execute(
        select(Documento)
        .options(selectinload(Documento.codigos))
        .where(Documento.id == documento_id)
    )
    documento = result.scalar_one_or_none()
    
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con ID {documento_id} no encontrado",
        )
    
    codigos_list = [
        {
            "id": codigo.id,
            "codigo": codigo.codigo,
            "codigo_normalizado": codigo.codigo_normalizado,
            "pagina": codigo.pagina,
            "posicion_x": codigo.posicion_x,
            "posicion_y": codigo.posicion_y,
            "contexto": codigo.contexto,
        }
        for codigo in documento.codigos
    ]
    
    return {
        "id": documento.id,
        "nombre": documento.nombre_original,
        "tipo": documento.tipo.value,
        "descripcion": documento.descripcion,
        "estado": documento.estado.value,
        "tamaño": documento.tamaño,
        "paginas": documento.paginas,
        "created_at": documento.created_at,
        "updated_at": documento.updated_at,
        "codigos": codigos_list,
        "total_codigos": len(codigos_list),
    }

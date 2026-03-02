"""
Endpoints para búsqueda de códigos en manifiestos.
"""

import re
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user_optional, get_db, get_pagination_params
from app.models.documento import Documento
from app.models.codigo import Codigo
from app.models.busqueda import Busqueda, ResultadoBusqueda
from app.schemas.busqueda import (
    BusquedaCreate,
    BusquedaResponse,
    BusquedaListResponse,
    ResultadoBusquedaResponse,
    EstadoBusqueda,
    EstadoResultado,
)
from app.schemas.documento import TipoDocumento, EstadoDocumento

router = APIRouter()


def normalizar_codigo(codigo: str) -> str:
    """Normaliza un código para búsqueda."""
    return codigo.upper().replace(" ", "").replace("-", "").replace("_", "").strip()


@router.post(
    "/ejecutar",
    status_code=status.HTTP_201_CREATED,
    summary="Ejecutar búsqueda",
    description="Ejecuta una búsqueda de códigos en los manifiestos.",
)
async def ejecutar_busqueda(
    busqueda: BusquedaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Ejecutar búsqueda de códigos en manifiestos.
    
    - **codigos**: Lista de códigos a buscar (típicamente de una factura)
    - **manifiesto_ids**: IDs de manifiestos donde buscar (opcional)
    - **busqueda_fuzzy**: Activar búsqueda tolerante a errores
    """
    logger.info(f"Ejecutando búsqueda de {len(busqueda.codigos)} códigos")
    
    # Normalizar códigos si está habilitado
    codigos_a_buscar = {}
    for codigo in busqueda.codigos:
        codigo_original = codigo.strip()
        if codigo_original:
            codigo_norm = normalizar_codigo(codigo_original) if busqueda.normalizar_codigos else codigo_original
            codigos_a_buscar[codigo_norm] = codigo_original
    
    if not codigos_a_buscar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionaron códigos válidos para buscar"
        )
    
    # Obtener manifiestos donde buscar
    manifiesto_query = select(Documento).where(
        Documento.tipo == TipoDocumento.MANIFIESTO,
        Documento.estado == EstadoDocumento.COMPLETADO
    )
    
    if busqueda.manifiesto_ids:
        manifiesto_query = manifiesto_query.where(
            Documento.id.in_(busqueda.manifiesto_ids)
        )
    
    result = await db.execute(manifiesto_query)
    manifiestos = result.scalars().all()
    
    logger.info(f"Buscando en {len(manifiestos)} manifiestos")
    
    # Resultados
    resultados = []
    encontrados = 0
    no_encontrados = 0
    parciales = 0
    
    for codigo_norm, codigo_orig in codigos_a_buscar.items():
        # Buscar coincidencias en códigos de manifiestos
        codigo_query = select(Codigo).join(Documento).where(
            Documento.tipo == TipoDocumento.MANIFIESTO
        )
        
        if busqueda.manifiesto_ids:
            codigo_query = codigo_query.where(
                Documento.id.in_(busqueda.manifiesto_ids)
            )
        
        # Buscar coincidencia exacta (normalizada)
        codigo_query = codigo_query.where(
            Codigo.codigo_normalizado == codigo_norm
        )
        
        result = await db.execute(
            codigo_query.options(selectinload(Codigo.documento))
        )
        coincidencias = result.scalars().all()
        
        # Si no encontró exacto y fuzzy está activado, buscar parciales
        similares = []
        if not coincidencias and busqueda.busqueda_fuzzy:
            # Buscar códigos similares (que contengan parte del código)
            like_pattern = f"%{codigo_norm[:min(5, len(codigo_norm))]}%"
            fuzzy_query = select(Codigo).join(Documento).where(
                Documento.tipo == TipoDocumento.MANIFIESTO,
                Codigo.codigo_normalizado.ilike(like_pattern)
            )
            if busqueda.manifiesto_ids:
                fuzzy_query = fuzzy_query.where(
                    Documento.id.in_(busqueda.manifiesto_ids)
                )
            fuzzy_result = await db.execute(
                fuzzy_query.options(selectinload(Codigo.documento)).limit(5)
            )
            coincidencias_fuzzy = fuzzy_result.scalars().all()
            similares = [c.codigo for c in coincidencias_fuzzy]
        
        # Construir resultado para este código
        ubicaciones = []
        for coincidencia in coincidencias:
            ubicaciones.append({
                "documento_id": coincidencia.documento.id,
                "documento_nombre": coincidencia.documento.nombre_original,
                "pagina": coincidencia.pagina,
                "linea": coincidencia.linea,
                "contexto": coincidencia.contexto or "",
                "posicion_x": coincidencia.posicion_x,
                "posicion_y": coincidencia.posicion_y,
            })
        
        if coincidencias:
            estado = EstadoResultado.ENCONTRADO
            encontrados += 1
        elif similares:
            estado = EstadoResultado.PARCIAL
            parciales += 1
        else:
            estado = EstadoResultado.NO_ENCONTRADO
            no_encontrados += 1
        
        resultados.append({
            "codigo_original": codigo_orig,
            "codigo_normalizado": codigo_norm,
            "estado": estado.value,
            "encontrado_en": ubicaciones,
            "frecuencia": len(coincidencias),
            "similares": similares if similares else None,
        })
    
    # Crear registro de búsqueda en DB
    busqueda_db = Busqueda(
        codigos_buscados=len(codigos_a_buscar),
        codigos_encontrados=encontrados,
        codigos_no_encontrados=no_encontrados,
        codigos_parciales=parciales,
        estado=EstadoBusqueda.COMPLETADO,
        busqueda_fuzzy=busqueda.busqueda_fuzzy,
    )
    db.add(busqueda_db)
    await db.commit()
    await db.refresh(busqueda_db)
    
    # Guardar resultados detallados
    for res in resultados:
        resultado_db = ResultadoBusqueda(
            busqueda_id=busqueda_db.id,
            codigo_original=res["codigo_original"],
            codigo_normalizado=res["codigo_normalizado"],
            estado=res["estado"],
            frecuencia=res["frecuencia"],
            ubicaciones=res["encontrado_en"],
            similares=res.get("similares"),
        )
        db.add(resultado_db)
    await db.commit()
    
    logger.info(
        f"Búsqueda completada: {encontrados} encontrados, "
        f"{parciales} parciales, {no_encontrados} no encontrados"
    )
    
    return {
        "id": busqueda_db.id,
        "codigos_buscados": len(codigos_a_buscar),
        "codigos_encontrados": encontrados,
        "codigos_no_encontrados": no_encontrados,
        "codigos_parciales": parciales,
        "estado": EstadoBusqueda.COMPLETADO.value,
        "busqueda_fuzzy": busqueda.busqueda_fuzzy,
        "created_at": busqueda_db.created_at,
        "mensaje": f"Búsqueda completada. {encontrados} de {len(codigos_a_buscar)} códigos encontrados.",
        "resultados": resultados,
        "resumen": {
            "total_buscados": len(codigos_a_buscar),
            "encontrados": encontrados,
            "parciales": parciales,
            "no_encontrados": no_encontrados,
            "porcentaje_encontrados": round(encontrados / len(codigos_a_buscar) * 100, 2) if codigos_a_buscar else 0,
            "manifiestos_consultados": len(manifiestos),
        }
    }


@router.post(
    "/buscar-en-texto",
    status_code=status.HTTP_200_OK,
    summary="Buscar códigos en texto de manifiestos",
    description="Busca códigos de factura directamente en el texto extraído de los manifiestos.",
)
async def buscar_en_texto(
    busqueda: BusquedaCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Búsqueda directa en texto de manifiestos.
    Útil cuando los manifiestos no tienen códigos pre-indexados.
    """
    from app.services.pdf_extractor import PDFExtractor
    from pathlib import Path
    
    logger.info(f"Búsqueda en texto de {len(busqueda.codigos)} códigos")
    
    # Normalizar códigos
    codigos_a_buscar = {}
    for codigo in busqueda.codigos:
        codigo_original = codigo.strip()
        if codigo_original:
            codigo_norm = normalizar_codigo(codigo_original) if busqueda.normalizar_codigos else codigo_original
            codigos_a_buscar[codigo_norm] = codigo_original
    
    # Obtener manifiestos
    manifiesto_query = select(Documento).where(
        Documento.tipo == TipoDocumento.MANIFIESTO
    )
    if busqueda.manifiesto_ids:
        manifiesto_query = manifiesto_query.where(
            Documento.id.in_(busqueda.manifiesto_ids)
        )
    
    result = await db.execute(manifiesto_query)
    manifiestos = result.scalars().all()
    
    resultados = []
    encontrados = 0
    no_encontrados = 0
    
    for codigo_norm, codigo_orig in codigos_a_buscar.items():
        ubicaciones = []
        
        # Buscar en cada manifiesto
        for manifiesto in manifiestos:
            try:
                pdf_path = Path(manifiesto.storage_path)
                if not pdf_path.exists():
                    continue
                
                extractor = PDFExtractor()
                resultado_pdf = extractor.extract_text(str(pdf_path))
                
                # Buscar el código en cada página
                for pagina in resultado_pdf.pages:
                    texto_normalizado = normalizar_codigo(pagina.text_content)
                    if codigo_norm in texto_normalizado:
                        # Encontrar contexto
                        texto_original = pagina.text_content
                        idx = texto_original.upper().replace("-", "").replace(" ", "").find(codigo_norm)
                        if idx >= 0:
                            start = max(0, idx - 50)
                            end = min(len(texto_original), idx + len(codigo_norm) + 50)
                            contexto = "..." + texto_original[start:end] + "..."
                        else:
                            contexto = ""
                        
                        ubicaciones.append({
                            "documento_id": manifiesto.id,
                            "documento_nombre": manifiesto.nombre_original,
                            "pagina": pagina.page_number,
                            "contexto": contexto,
                        })
            except Exception as e:
                logger.warning(f"Error procesando {manifiesto.nombre}: {e}")
        
        if ubicaciones:
            estado = EstadoResultado.ENCONTRADO
            encontrados += 1
        else:
            estado = EstadoResultado.NO_ENCONTRADO
            no_encontrados += 1
        
        resultados.append({
            "codigo_original": codigo_orig,
            "codigo_normalizado": codigo_norm,
            "estado": estado.value,
            "encontrado_en": ubicaciones,
            "frecuencia": len(ubicaciones),
            "similares": None,
        })
    
    return {
        "codigos_buscados": len(codigos_a_buscar),
        "codigos_encontrados": encontrados,
        "codigos_no_encontrados": no_encontrados,
        "estado": "completado",
        "mensaje": f"Búsqueda en texto completada. {encontrados} códigos encontrados.",
        "resultados": resultados,
        "resumen": {
            "total_buscados": len(codigos_a_buscar),
            "encontrados": encontrados,
            "no_encontrados": no_encontrados,
            "porcentaje_encontrados": round(encontrados / len(codigos_a_buscar) * 100, 2) if codigos_a_buscar else 0,
            "manifiestos_consultados": len(manifiestos),
        }
    }


@router.get(
    "/historial",
    response_model=BusquedaListResponse,
    summary="Historial de búsquedas",
    description="Obtiene el historial de búsquedas realizadas.",
)
async def historial_busquedas(
    pagination: dict = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Obtener historial de búsquedas realizadas.
    """
    # Contar total
    count_result = await db.execute(select(func.count(Busqueda.id)))
    total = count_result.scalar() or 0
    
    # Obtener búsquedas paginadas
    query = select(Busqueda).order_by(
        Busqueda.created_at.desc()
    ).offset(pagination["skip"]).limit(pagination["limit"])
    
    result = await db.execute(query)
    busquedas = result.scalars().all()
    
    items = [
        {
            "id": b.id,
            "codigos_buscados": b.codigos_buscados,
            "codigos_encontrados": b.codigos_encontrados,
            "codigos_no_encontrados": b.codigos_no_encontrados,
            "estado": b.estado.value if hasattr(b.estado, 'value') else b.estado,
            "busqueda_fuzzy": b.busqueda_fuzzy,
            "created_at": b.created_at,
        }
        for b in busquedas
    ]
    
    return {
        "items": items,
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
    }


@router.get(
    "/{busqueda_id}",
    summary="Obtener búsqueda",
    description="Obtiene información de una búsqueda por su ID.",
)
async def get_busqueda(
    busqueda_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Obtener información de una búsqueda específica.
    """
    result = await db.execute(
        select(Busqueda).where(Busqueda.id == busqueda_id)
    )
    busqueda = result.scalar_one_or_none()
    
    if not busqueda:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Búsqueda con ID {busqueda_id} no encontrada",
        )
    
    return {
        "id": busqueda.id,
        "codigos_buscados": busqueda.codigos_buscados,
        "codigos_encontrados": busqueda.codigos_encontrados,
        "codigos_no_encontrados": busqueda.codigos_no_encontrados,
        "estado": busqueda.estado.value if hasattr(busqueda.estado, 'value') else busqueda.estado,
        "busqueda_fuzzy": busqueda.busqueda_fuzzy,
        "created_at": busqueda.created_at,
    }


@router.get(
    "/{busqueda_id}/resultados",
    summary="Resultados de búsqueda",
    description="Obtiene los resultados detallados de una búsqueda.",
)
async def get_resultados_busqueda(
    busqueda_id: int,
    solo_encontrados: bool = Query(False, description="Filtrar solo códigos encontrados"),
    solo_no_encontrados: bool = Query(False, description="Filtrar solo códigos no encontrados"),
    pagination: dict = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_db),
):
    """
    Obtener resultados detallados de una búsqueda.
    
    - **solo_encontrados**: Mostrar solo códigos encontrados
    - **solo_no_encontrados**: Mostrar solo códigos no encontrados
    """
    # Verificar que la búsqueda existe
    result = await db.execute(
        select(Busqueda).where(Busqueda.id == busqueda_id)
    )
    busqueda = result.scalar_one_or_none()
    
    if not busqueda:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Búsqueda con ID {busqueda_id} no encontrada",
        )
    
    # Query para resultados
    query = select(ResultadoBusqueda).where(
        ResultadoBusqueda.busqueda_id == busqueda_id
    )
    
    if solo_encontrados:
        query = query.where(ResultadoBusqueda.estado == EstadoResultado.ENCONTRADO.value)
    elif solo_no_encontrados:
        query = query.where(ResultadoBusqueda.estado == EstadoResultado.NO_ENCONTRADO.value)
    
    # Contar total
    count_query = select(func.count(ResultadoBusqueda.id)).where(
        ResultadoBusqueda.busqueda_id == busqueda_id
    )
    if solo_encontrados:
        count_query = count_query.where(ResultadoBusqueda.estado == EstadoResultado.ENCONTRADO.value)
    elif solo_no_encontrados:
        count_query = count_query.where(ResultadoBusqueda.estado == EstadoResultado.NO_ENCONTRADO.value)
    
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Obtener resultados paginados
    query = query.offset(pagination["skip"]).limit(pagination["limit"])
    result = await db.execute(query)
    resultados = result.scalars().all()
    
    items = [
        {
            "codigo_original": r.codigo_original,
            "codigo_normalizado": r.codigo_normalizado,
            "estado": r.estado,
            "encontrado_en": r.ubicaciones or [],
            "frecuencia": r.frecuencia,
            "similares": r.similares,
        }
        for r in resultados
    ]
    
    return {
        "busqueda_id": busqueda_id,
        "resultados": items,
        "resumen": {
            "total_buscados": busqueda.codigos_buscados,
            "encontrados": busqueda.codigos_encontrados,
            "no_encontrados": busqueda.codigos_no_encontrados,
            "porcentaje_encontrados": round(
                busqueda.codigos_encontrados / busqueda.codigos_buscados * 100, 2
            ) if busqueda.codigos_buscados > 0 else 0,
        },
        "total": total,
        "skip": pagination["skip"],
        "limit": pagination["limit"],
    }

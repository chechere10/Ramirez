"""
Endpoints para resaltar códigos en PDFs.

IMPORTANTE: Estos endpoints preservan la integridad de los documentos legales.
Los PDFs de la DIAN NO se modifican - solo se agregan anotaciones de resaltado.
"""

from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.pdf_highlighter import (
    ColorResaltado,
    PDFHighlighter,
    resaltar_codigos_en_pdf,
    generar_reporte_separado,
)

router = APIRouter()

# Zona horaria de Colombia
TIMEZONE_COLOMBIA = ZoneInfo("America/Bogota")


class ResaltarRequest(BaseModel):
    """Request para resaltar códigos en un PDF ya cargado."""
    documento_id: int
    codigos: List[str]
    color: str = "amarillo"


class ResaltarResponse(BaseModel):
    """Respuesta del servicio de resaltado."""
    total_codigos_buscados: int
    codigos_encontrados: int
    codigos_no_encontrados: List[str]
    detalle_por_pagina: dict
    resumen: str
    paginas_originales: int


@router.post(
    "/resaltar-pdf",
    response_class=Response,
    summary="Resaltar códigos en un PDF (preservando integridad)",
    description="""
    Sube un PDF y una lista de códigos para resaltar.
    
    **IMPORTANTE**: Este endpoint preserva la integridad del documento original.
    Los documentos de la DIAN tienen validez legal y NO se modifican.
    
    El sistema:
    1. Busca cada código en el PDF (sin importar formato: con/sin guiones, mayúsculas/minúsculas)
    2. Agrega anotaciones de resaltado (NO modifica el contenido)
    3. Retorna el PDF con el mismo número de páginas que el original
    
    **Colores disponibles**: amarillo, verde, azul, rojo, naranja, rosa, cian, violeta
    
    NOTA: Si necesita un reporte/índice de códigos, use el endpoint /resaltar-con-reporte
    que retorna el PDF anotado + un reporte PDF separado.
    """,
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "PDF con anotaciones de resaltado (integridad preservada)"
        }
    }
)
async def resaltar_pdf_upload(
    pdf: UploadFile = File(..., description="Archivo PDF del manifiesto"),
    codigos: str = Form(..., description="Códigos separados por coma o salto de línea"),
    color: str = Form("amarillo", description="Color del resaltado"),
):
    """
    Resalta códigos en un PDF subido (preservando integridad del documento).
    
    El documento retornado tiene exactamente el mismo número de páginas
    que el original, con anotaciones de resaltado sobre los códigos encontrados.
    
    Ejemplo de uso con curl:
    ```bash
    curl -X POST "http://localhost:8005/api/v1/highlight/resaltar-pdf" \
      -F "pdf=@manifiesto.pdf" \
      -F "codigos=MSCU1234567, REF-2024-001, BL-ABC123" \
      -F "color=amarillo" \
      --output manifiesto_resaltado.pdf
    ```
    """
    # Validar que es un PDF
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un PDF"
        )
    
    # Leer contenido del PDF
    pdf_bytes = await pdf.read()
    
    if len(pdf_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo PDF está vacío"
        )
    
    # Parsear códigos (separados por coma, punto y coma, o salto de línea)
    import re
    lista_codigos = [
        c.strip() 
        for c in re.split(r'[,;\n\r]+', codigos) 
        if c.strip()
    ]
    
    if not lista_codigos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un código"
        )
    
    try:
        # Resaltar códigos (preserva integridad)
        resultado = resaltar_codigos_en_pdf(
            pdf_bytes,
            lista_codigos,
            color=color,
        )
        
        # Nombre del archivo de salida
        nombre_original = pdf.filename.rsplit('.', 1)[0]
        nombre_salida = f"{nombre_original}_resaltado.pdf"
        
        return Response(
            content=resultado.pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{nombre_salida}"',
                "X-Codigos-Encontrados": str(resultado.codigos_encontrados),
                "X-Codigos-Total": str(resultado.total_codigos_buscados),
                "X-Paginas-Originales": str(resultado.paginas_originales),
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando PDF: {str(e)}"
        )


@router.post(
    "/resaltar-info",
    response_model=ResaltarResponse,
    summary="Obtener información de resaltado sin modificar PDF",
    description="""
    Analiza el PDF y retorna información sobre qué códigos se encontrarían.
    
    Útil para previsualizar antes de generar el PDF anotado.
    """
)
async def resaltar_pdf_info(
    pdf: UploadFile = File(..., description="Archivo PDF del manifiesto"),
    codigos: str = Form(..., description="Códigos separados por coma o salto de línea"),
    color: str = Form("amarillo", description="Color del resaltado"),
):
    """
    Analiza el PDF y retorna información detallada (sin generar el PDF anotado).
    
    Útil para previsualizar qué códigos se encontrarán.
    """
    # Validar PDF
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un PDF"
        )
    
    pdf_bytes = await pdf.read()
    
    # Parsear códigos
    import re
    lista_codigos = [
        c.strip() 
        for c in re.split(r'[,;\n\r]+', codigos) 
        if c.strip()
    ]
    
    if not lista_codigos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un código"
        )
    
    try:
        resultado = resaltar_codigos_en_pdf(
            pdf_bytes,
            lista_codigos,
            color=color,
        )
        
        return ResaltarResponse(
            total_codigos_buscados=resultado.total_codigos_buscados,
            codigos_encontrados=resultado.codigos_encontrados,
            codigos_no_encontrados=resultado.codigos_no_encontrados,
            detalle_por_pagina=resultado.detalle_por_pagina,
            resumen=resultado.resumen,
            paginas_originales=resultado.paginas_originales
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando PDF: {str(e)}"
        )


@router.post(
    "/resaltar-con-reporte",
    summary="Resaltar PDF + generar reporte separado",
    description="""
    Resalta códigos en el PDF y genera un reporte separado.
    
    **IMPORTANTE**: El documento original se preserva íntegramente.
    
    Retorna un ZIP con:
    - `documento_resaltado.pdf`: El documento original con anotaciones de resaltado
    - `reporte_codigos.pdf`: Un PDF separado con el índice y estadísticas
    
    De esta forma se mantiene la validez legal del documento DIAN mientras
    se proporciona un reporte complementario.
    """
)
async def resaltar_con_reporte(
    pdf: UploadFile = File(..., description="Archivo PDF del manifiesto"),
    codigos: str = Form(..., description="Códigos separados por coma o salto de línea"),
    color: str = Form("amarillo", description="Color del resaltado"),
):
    """
    Genera el PDF anotado + reporte separado en un archivo ZIP.
    """
    import io
    import zipfile
    
    # Validar PDF
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un PDF"
        )
    
    pdf_bytes = await pdf.read()
    nombre_original = pdf.filename.rsplit('.', 1)[0]
    
    # Parsear códigos
    import re
    lista_codigos = [
        c.strip() 
        for c in re.split(r'[,;\n\r]+', codigos) 
        if c.strip()
    ]
    
    if not lista_codigos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un código"
        )
    
    try:
        # Resaltar códigos (preserva integridad)
        resultado = resaltar_codigos_en_pdf(
            pdf_bytes,
            lista_codigos,
            color=color,
        )
        
        # Generar reporte separado
        reporte_bytes = generar_reporte_separado(resultado, nombre_original)
        
        # Crear ZIP con ambos archivos
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr(
                f"{nombre_original}_resaltado.pdf",
                resultado.pdf_bytes
            )
            zip_file.writestr(
                f"{nombre_original}_reporte.pdf",
                reporte_bytes
            )
        
        zip_buffer.seek(0)
        
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{nombre_original}_paquete.zip"',
                "X-Codigos-Encontrados": str(resultado.codigos_encontrados),
                "X-Codigos-Total": str(resultado.total_codigos_buscados),
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando PDF: {str(e)}"
        )


@router.post(
    "/resaltar-csv",
    summary="Analizar PDF y exportar resultados a CSV",
    description="""
    Analiza el PDF buscando los códigos y genera un reporte en formato CSV.
    
    El CSV incluye:
    - Código buscado
    - Estado (ENCONTRADO/NO ENCONTRADO)
    - Página(s) donde se encontró
    - Frecuencia de apariciones
    - Nombre del documento
    - Fecha de procesamiento
    
    **Formatos disponibles:**
    - `simple`: Una fila por código (default)
    - `detallado`: Una fila por cada ocurrencia
    - `resumen`: Estadísticas generales
    
    **Separadores:**
    - `,` (coma) - Default, estándar CSV
    - `;` (punto y coma) - Mejor para Excel en español
    """
)
async def resaltar_csv(
    pdf: UploadFile = File(..., description="Archivo PDF del manifiesto"),
    codigos: str = Form(..., description="Códigos separados por coma o salto de línea"),
    formato: str = Form("simple", description="Formato: simple, detallado, resumen"),
    separador: str = Form(",", description="Separador: coma (,) o punto y coma (;)"),
):
    """
    Genera un CSV con los resultados de búsqueda de códigos.
    """
    from app.services.csv_generator import (
        generar_csv_resultado,
        generar_csv_detallado,
        generar_csv_resumen,
    )
    
    # Validar PDF
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un PDF"
        )
    
    pdf_bytes = await pdf.read()
    nombre_original = pdf.filename.rsplit('.', 1)[0]
    
    # Parsear códigos
    import re
    lista_codigos = [
        c.strip() 
        for c in re.split(r'[,;\n\r]+', codigos) 
        if c.strip()
    ]
    
    if not lista_codigos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un código"
        )
    
    # Validar separador
    if separador not in [",", ";"]:
        separador = ","
    
    try:
        # Procesar PDF (sin generar el PDF anotado, solo buscar)
        resultado = resaltar_codigos_en_pdf(
            pdf_bytes,
            lista_codigos,
            color="amarillo",  # No importa, no se genera PDF
        )
        
        # Generar CSV según formato
        if formato == "detallado":
            csv_bytes = generar_csv_detallado(resultado, nombre_original, separador)
            nombre_salida = f"{nombre_original}_detallado.csv"
        elif formato == "resumen":
            csv_bytes = generar_csv_resumen(resultado, nombre_original, separador)
            nombre_salida = f"{nombre_original}_resumen.csv"
        else:
            csv_bytes = generar_csv_resultado(resultado, nombre_original, separador)
            nombre_salida = f"{nombre_original}_resultados.csv"
        
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{nombre_salida}"',
                "X-Codigos-Encontrados": str(resultado.codigos_encontrados),
                "X-Codigos-Total": str(resultado.total_codigos_buscados),
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando PDF: {str(e)}"
        )


@router.post(
    "/paquete-completo",
    summary="Generar paquete completo (PDF anotado + Reporte + CSV)",
    description="""
    Genera un paquete completo con todos los formatos de salida:
    
    Retorna un ZIP con:
    - `documento_resaltado.pdf`: PDF original con anotaciones de resaltado
    - `reporte_codigos.pdf`: Reporte separado con índice y estadísticas
    - `resultados.csv`: Datos en formato CSV para Excel
    
    Ideal para procesamiento completo de documentos.
    """
)
async def paquete_completo(
    pdf: UploadFile = File(..., description="Archivo PDF del manifiesto"),
    codigos: str = Form(..., description="Códigos separados por coma o salto de línea"),
    color: str = Form("amarillo", description="Color del resaltado"),
):
    """
    Genera paquete completo: PDF anotado + Reporte PDF + CSV.
    """
    import io
    import zipfile
    from app.services.csv_generator import generar_csv_resultado
    
    # Validar PDF
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un PDF"
        )
    
    pdf_bytes = await pdf.read()
    nombre_original = pdf.filename.rsplit('.', 1)[0]
    
    # Parsear códigos
    import re
    lista_codigos = [
        c.strip() 
        for c in re.split(r'[,;\n\r]+', codigos) 
        if c.strip()
    ]
    
    if not lista_codigos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un código"
        )
    
    try:
        # Resaltar códigos (preserva integridad)
        resultado = resaltar_codigos_en_pdf(
            pdf_bytes,
            lista_codigos,
            color=color,
        )
        
        # Generar reporte PDF separado
        reporte_bytes = generar_reporte_separado(resultado, nombre_original)
        
        # Generar CSV (con punto y coma para Excel en español)
        csv_bytes = generar_csv_resultado(resultado, nombre_original, separador=";")
        
        # Crear ZIP con todos los archivos
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr(
                f"{nombre_original}_resaltado.pdf",
                resultado.pdf_bytes
            )
            zip_file.writestr(
                f"{nombre_original}_reporte.pdf",
                reporte_bytes
            )
            zip_file.writestr(
                f"{nombre_original}_resultados.csv",
                csv_bytes
            )
        
        zip_buffer.seek(0)
        
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{nombre_original}_paquete_completo.zip"',
                "X-Codigos-Encontrados": str(resultado.codigos_encontrados),
                "X-Codigos-Total": str(resultado.total_codigos_buscados),
                "X-Paginas-Originales": str(resultado.paginas_originales),
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando PDF: {str(e)}"
        )


@router.get(
    "/colores",
    summary="Obtener colores disponibles",
    description="Lista de colores disponibles para resaltar"
)
async def get_colores():
    """Retorna los colores disponibles para resaltado."""
    return {
        "colores": [
            {"nombre": "amarillo", "descripcion": "Amarillo clásico (recomendado)"},
            {"nombre": "verde", "descripcion": "Verde claro"},
            {"nombre": "rosa", "descripcion": "Rosa"},
            {"nombre": "azul", "descripcion": "Azul claro"},
            {"nombre": "naranja", "descripcion": "Naranja"},
            {"nombre": "rojo", "descripcion": "Rojo claro"},
            {"nombre": "cian", "descripcion": "Cian"},
            {"nombre": "violeta", "descripcion": "Violeta"},
        ]
    }


# ============================================
# Gestión de Clientes y Documentos Guardados
# ============================================

import os
import json
from datetime import datetime
from pathlib import Path

# Directorio base para almacenar documentos
STORAGE_DIR = Path("/app/storage/clientes")


class ClienteResponse(BaseModel):
    """Respuesta de cliente."""
    id: str
    nombre: str
    nit: str
    telefono: str = ""
    email: str = ""
    departamento: str = ""
    direccion: str = ""
    fecha_creacion: str = ""
    total_documentos: int = 0


class DocumentoGuardadoResponse(BaseModel):
    """Respuesta de documento guardado."""
    id: str
    nombre: str
    nombre_original: str
    fecha_guardado: str
    total_paginas: int
    codigos_encontrados: int
    codigos_buscados: int
    color_resaltado: str
    tamaño: str
    cliente_id: str


@router.post(
    "/guardar-manifiesto",
    summary="Guardar manifiesto resaltado asociado a un cliente",
    description="""
    Procesa el PDF con los códigos, lo resalta y lo guarda en el almacenamiento
    asociado al cliente especificado.
    """
)
async def guardar_manifiesto(
    pdf: UploadFile = File(..., description="Archivo PDF del manifiesto"),
    codigos: str = Form(..., description="Códigos separados por coma"),
    color: str = Form("amarillo", description="Color del resaltado"),
    cliente: str = Form(..., description="Nombre del cliente"),
    cliente_id: str = Form(..., description="ID del cliente"),
    cliente_nit: str = Form("", description="NIT del cliente"),
):
    """
    Resalta códigos en el PDF y lo guarda asociado al cliente.
    """
    import re
    
    # Validar PDF
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un PDF"
        )
    
    pdf_bytes = await pdf.read()
    nombre_original = pdf.filename
    
    # Parsear códigos
    lista_codigos = [
        c.strip() 
        for c in re.split(r'[,;\n\r]+', codigos) 
        if c.strip()
    ]
    
    if not lista_codigos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un código"
        )
    
    try:
        # Resaltar códigos
        resultado = resaltar_codigos_en_pdf(
            pdf_bytes,
            lista_codigos,
            color=color,
        )
        
        # Crear directorio del cliente si no existe
        cliente_dir = STORAGE_DIR / cliente_id
        cliente_dir.mkdir(parents=True, exist_ok=True)
        
        # Generar nombre único para el archivo (con microsegundos para evitar colisiones)
        ahora_colombia = datetime.now(TIMEZONE_COLOMBIA)
        timestamp = ahora_colombia.strftime("%Y%m%d_%H%M%S_%f")
        nombre_base = nombre_original.rsplit('.', 1)[0]
        nombre_archivo = f"{nombre_base}_resaltado_{timestamp}.pdf"
        
        print(f"[GUARDAR] Guardando PDF: {nombre_archivo} para cliente {cliente}")
        
        # Guardar PDF resaltado
        ruta_pdf = cliente_dir / nombre_archivo
        with open(ruta_pdf, 'wb') as f:
            f.write(resultado.pdf_bytes)
        
        print(f"[GUARDAR] PDF guardado exitosamente en: {ruta_pdf}")
        
        # Calcular tamaño
        tamaño_bytes = len(resultado.pdf_bytes)
        if tamaño_bytes < 1024:
            tamaño_str = f"{tamaño_bytes} B"
        elif tamaño_bytes < 1024 * 1024:
            tamaño_str = f"{tamaño_bytes / 1024:.1f} KB"
        else:
            tamaño_str = f"{tamaño_bytes / (1024 * 1024):.1f} MB"
        
        # Crear metadata del documento
        doc_id = f"{cliente_id}_{timestamp}"
        metadata = {
            "id": doc_id,
            "nombre": nombre_archivo,
            "nombre_original": nombre_original,
            "fecha_guardado": ahora_colombia.isoformat(),
            "total_paginas": resultado.paginas_originales,
            "codigos_encontrados": resultado.codigos_encontrados,
            "codigos_buscados": resultado.total_codigos_buscados,
            "color_resaltado": color,
            "tamaño": tamaño_str,
            "cliente_id": cliente_id,
            "cliente_nombre": cliente,
            "cliente_nit": cliente_nit,
            "codigos_lista": lista_codigos,
            "codigos_no_encontrados": resultado.codigos_no_encontrados,
        }
        
        # Guardar metadata
        ruta_metadata = cliente_dir / f"{nombre_base}_resaltado_{timestamp}.json"
        with open(ruta_metadata, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        return {
            "success": True,
            "mensaje": f"Manifiesto guardado exitosamente para el cliente {cliente}",
            "documento": metadata
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error guardando manifiesto: {str(e)}"
        )


@router.get(
    "/clientes",
    summary="Listar clientes con documentos",
    description="Retorna la lista de clientes que tienen documentos guardados"
)
async def listar_clientes():
    """Lista todos los clientes con documentos guardados."""
    clientes = []
    
    if not STORAGE_DIR.exists():
        return {"clientes": clientes}
    
    for cliente_dir in STORAGE_DIR.iterdir():
        if cliente_dir.is_dir():
            # Contar documentos (archivos JSON de metadata)
            documentos = list(cliente_dir.glob("*.json"))
            
            if documentos:
                # Leer metadata del primer documento para obtener info del cliente
                with open(documentos[0], 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                
                clientes.append({
                    "id": cliente_dir.name,
                    "nombre": metadata.get("cliente_nombre", cliente_dir.name),
                    "nit": metadata.get("cliente_nit", ""),
                    "total_documentos": len(documentos),
                })
    
    return {"clientes": clientes}


@router.get(
    "/clientes/{cliente_id}/ultimos-colores",
    summary="Obtener últimos colores usados por cliente",
    description="Retorna los colores de los últimos manifiestos del cliente para evitar repetición"
)
async def obtener_ultimos_colores(cliente_id: str, cantidad: int = 3):
    """Obtiene los últimos colores usados por un cliente."""
    cliente_dir = STORAGE_DIR / cliente_id
    
    if not cliente_dir.exists():
        return {"colores": [], "sugerencia": None}
    
    documentos = []
    for metadata_file in cliente_dir.glob("*.json"):
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            documentos.append({
                "fecha": metadata.get("fecha_guardado", ""),
                "color": metadata.get("color_resaltado", "amarillo"),
            })
    
    # Ordenar por fecha (más reciente primero)
    documentos.sort(key=lambda x: x.get("fecha", ""), reverse=True)
    
    # Obtener los últimos N colores
    ultimos_colores = [d["color"] for d in documentos[:cantidad]]
    
    # Sugerir un color que no esté en los últimos usados
    colores_disponibles = ["amarillo", "verde", "azul", "rosa", "naranja", "cian"]
    sugerencia = None
    for color in colores_disponibles:
        if color not in ultimos_colores:
            sugerencia = color
            break
    
    # Si todos los colores están usados, sugerir el primero disponible
    if sugerencia is None:
        sugerencia = colores_disponibles[0]
    
    return {
        "colores": ultimos_colores,
        "sugerencia": sugerencia
    }


@router.get(
    "/clientes/{cliente_id}/documentos",
    summary="Listar documentos de un cliente",
    description="Retorna la lista de documentos guardados para un cliente"
)
async def listar_documentos_cliente(cliente_id: str):
    """Lista todos los documentos de un cliente."""
    cliente_dir = STORAGE_DIR / cliente_id
    
    if not cliente_dir.exists():
        return {"documentos": []}
    
    documentos = []
    for metadata_file in cliente_dir.glob("*.json"):
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            documentos.append({
                "id": metadata.get("id"),
                "nombre": metadata.get("nombre"),
                "nombre_original": metadata.get("nombre_original"),
                "fecha_guardado": metadata.get("fecha_guardado"),
                "total_paginas": metadata.get("total_paginas"),
                "codigos_encontrados": metadata.get("codigos_encontrados"),
                "codigos_buscados": metadata.get("codigos_buscados"),
                "color_resaltado": metadata.get("color_resaltado"),
                "tamaño": metadata.get("tamaño"),
            })
    
    # Ordenar por fecha (más reciente primero)
    documentos.sort(key=lambda x: x.get("fecha_guardado", ""), reverse=True)
    
    return {"documentos": documentos}


@router.get(
    "/clientes/{cliente_id}/documentos/{doc_id}/descargar",
    summary="Descargar documento guardado",
    description="Descarga un documento PDF guardado"
)
async def descargar_documento(cliente_id: str, doc_id: str):
    """Descarga un documento guardado."""
    cliente_dir = STORAGE_DIR / cliente_id
    
    # Buscar el archivo por ID
    for metadata_file in cliente_dir.glob("*.json"):
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            if metadata.get("id") == doc_id:
                # Encontrar el PDF correspondiente
                pdf_path = cliente_dir / metadata.get("nombre")
                if pdf_path.exists():
                    with open(pdf_path, 'rb') as pdf_file:
                        pdf_content = pdf_file.read()
                    
                    return Response(
                        content=pdf_content,
                        media_type="application/pdf",
                        headers={
                            "Content-Disposition": f'attachment; filename="{metadata.get("nombre")}"'
                        }
                    )
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Documento no encontrado"
    )


@router.delete(
    "/clientes/{cliente_id}/documentos/{doc_id}",
    summary="Eliminar documento guardado",
    description="Elimina un documento guardado"
)
async def eliminar_documento(cliente_id: str, doc_id: str):
    """Elimina un documento guardado."""
    cliente_dir = STORAGE_DIR / cliente_id
    
    # Buscar el archivo por ID
    for metadata_file in cliente_dir.glob("*.json"):
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            if metadata.get("id") == doc_id:
                # Eliminar PDF
                pdf_path = cliente_dir / metadata.get("nombre")
                if pdf_path.exists():
                    os.remove(pdf_path)
                
                # Eliminar metadata
                os.remove(metadata_file)
                
                return {"success": True, "mensaje": "Documento eliminado"}
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Documento no encontrado"
    )


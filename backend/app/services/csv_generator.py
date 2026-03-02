"""
Servicio para generación de reportes CSV.

Genera reportes en formato CSV compatible con Excel y otros programas.
"""

import csv
import io
from datetime import datetime
from typing import Dict, List, Optional

from app.services.pdf_highlighter import ResultadoResaltado, CodigoEncontrado


def generar_csv_resultado(
    resultado: ResultadoResaltado,
    nombre_documento: str = "Documento",
    separador: str = ",",
) -> bytes:
    """
    Genera un CSV con los resultados de la búsqueda de códigos.
    
    Args:
        resultado: ResultadoResaltado de una búsqueda
        nombre_documento: Nombre del documento procesado
        separador: Separador de columnas (coma por defecto, punto y coma para Excel español)
        
    Returns:
        bytes del CSV en UTF-8 con BOM para compatibilidad Excel
    """
    output = io.StringIO()
    
    writer = csv.writer(output, delimiter=separador, quoting=csv.QUOTE_MINIMAL)
    
    # Headers
    writer.writerow([
        "Código",
        "Estado",
        "Página(s)",
        "Frecuencia",
        "Documento",
        "Fecha Procesamiento"
    ])
    
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Códigos encontrados
    for codigo, ubicaciones in sorted(resultado.detalle_encontrados.items()):
        paginas = sorted(set(u.pagina for u in ubicaciones))
        paginas_str = ", ".join(str(p) for p in paginas)
        frecuencia = len(ubicaciones)
        
        writer.writerow([
            codigo,
            "ENCONTRADO",
            paginas_str,
            frecuencia,
            nombre_documento,
            fecha
        ])
    
    # Códigos no encontrados
    for codigo in sorted(resultado.codigos_no_encontrados):
        writer.writerow([
            codigo,
            "NO ENCONTRADO",
            "-",
            0,
            nombre_documento,
            fecha
        ])
    
    # Retornar con BOM UTF-8 para compatibilidad con Excel
    csv_content = output.getvalue()
    return ('\ufeff' + csv_content).encode('utf-8')


def generar_csv_detallado(
    resultado: ResultadoResaltado,
    nombre_documento: str = "Documento",
    separador: str = ",",
) -> bytes:
    """
    Genera un CSV detallado con cada ocurrencia de código.
    
    Cada fila representa una ocurrencia específica, no un código único.
    
    Args:
        resultado: ResultadoResaltado de una búsqueda
        nombre_documento: Nombre del documento procesado
        separador: Separador de columnas
        
    Returns:
        bytes del CSV en UTF-8 con BOM
    """
    output = io.StringIO()
    
    writer = csv.writer(output, delimiter=separador, quoting=csv.QUOTE_MINIMAL)
    
    # Headers detallados
    writer.writerow([
        "Código Buscado",
        "Código Encontrado",
        "Página",
        "Posición X",
        "Posición Y",
        "Contexto",
        "Documento",
        "Fecha Procesamiento"
    ])
    
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Cada ocurrencia
    for codigo_buscado, ubicaciones in sorted(resultado.detalle_encontrados.items()):
        for ubicacion in ubicaciones:
            writer.writerow([
                codigo_buscado,
                ubicacion.codigo,
                ubicacion.pagina,
                round(ubicacion.rect[0], 2),  # x0
                round(ubicacion.rect[1], 2),  # y0
                ubicacion.texto_contexto[:100] if ubicacion.texto_contexto else "",
                nombre_documento,
                fecha
            ])
    
    csv_content = output.getvalue()
    return ('\ufeff' + csv_content).encode('utf-8')


def generar_csv_resumen(
    resultado: ResultadoResaltado,
    nombre_documento: str = "Documento",
    separador: str = ",",
) -> bytes:
    """
    Genera un CSV de resumen con estadísticas generales.
    
    Args:
        resultado: ResultadoResaltado de una búsqueda
        nombre_documento: Nombre del documento procesado
        separador: Separador de columnas
        
    Returns:
        bytes del CSV en UTF-8 con BOM
    """
    output = io.StringIO()
    
    writer = csv.writer(output, delimiter=separador, quoting=csv.QUOTE_MINIMAL)
    
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Formato clave-valor
    writer.writerow(["Campo", "Valor"])
    writer.writerow(["Documento", nombre_documento])
    writer.writerow(["Fecha Procesamiento", fecha])
    writer.writerow(["Páginas Documento", resultado.paginas_originales])
    writer.writerow(["Total Códigos Buscados", resultado.total_codigos_buscados])
    writer.writerow(["Códigos Encontrados", resultado.codigos_encontrados])
    writer.writerow(["Códigos No Encontrados", len(resultado.codigos_no_encontrados)])
    
    porcentaje = (resultado.codigos_encontrados / resultado.total_codigos_buscados * 100) if resultado.total_codigos_buscados > 0 else 0
    writer.writerow(["Porcentaje Éxito", f"{porcentaje:.1f}%"])
    
    # Lista de códigos no encontrados
    writer.writerow([])
    writer.writerow(["Códigos No Encontrados:"])
    for codigo in sorted(resultado.codigos_no_encontrados):
        writer.writerow([codigo])
    
    csv_content = output.getvalue()
    return ('\ufeff' + csv_content).encode('utf-8')

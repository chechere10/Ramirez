"""
Servicio para resaltar códigos en documentos PDF.

IMPORTANTE: Este servicio está diseñado para preservar la integridad
de documentos legales (como manifiestos de la DIAN). 

PRINCIPIOS:
- NUNCA modifica el contenido original del PDF
- Solo agrega anotaciones de resaltado (highlight annotations)
- NO agrega páginas adicionales al documento original
- NO agrega marcas de agua
- Las anotaciones son una capa visual sobre el documento
- Aplica OCR automáticamente para PDFs escaneados

El resultado es el mismo documento con anotaciones visibles pero
que preserva toda la validez legal del documento original.

ARQUITECTURA OCR (v3.0):
- PRIORIDAD 1: EasyOCR (deep learning, alta precisión, coordenadas exactas)
- PRIORIDAD 2: Búsqueda nativa PyMuPDF (para PDFs con texto)
- PRIORIDAD 3: OCRmyPDF + Tesseract (fallback)
- Matching difuso inteligente para errores de OCR
"""

import hashlib
import io
import re
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime

import fitz  # PyMuPDF
from loguru import logger
from PIL import Image

# Importar EasyOCR Service (PRIORIDAD 1 - Más preciso)
try:
    from app.services.easyocr_service import (
        EasyOCRService,
        get_easyocr_service,
        is_easyocr_available,
        OCRWord,
        OCRPageResult
    )
    EASYOCR_AVAILABLE = is_easyocr_available()
except ImportError:
    EASYOCR_AVAILABLE = False
    logger.warning("EasyOCR Service no disponible")

# Importar servicio OCR legacy (FALLBACK)
try:
    from app.services.ocr_service import (
        OCRService, 
        get_ocr_service, 
        process_pdf_with_ocr,
        OCRResult,
        WordPosition
    )
    OCR_SERVICE_AVAILABLE = True
except ImportError:
    OCR_SERVICE_AVAILABLE = False
    logger.warning("OCR Service no disponible, usando fallback pytesseract")

# Fallback a pytesseract si el servicio no está disponible
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


class ColorResaltado(Enum):
    """Colores disponibles para resaltar - versiones más oscuras para mejor visibilidad."""
    AMARILLO = (1, 0.85, 0)       # Amarillo oscuro/dorado
    VERDE = (0.2, 0.7, 0.2)       # Verde oscuro
    ROSA = (1.0, 0.6, 0.7)        # Rosa suave/pastel
    AZUL = (0.2, 0.5, 0.9)        # Azul intenso
    NARANJA = (1, 0.5, 0)         # Naranja intenso
    ROJO = (0.9, 0.2, 0.2)        # Rojo intenso
    ROJO_CLARO = (1, 0.4, 0.4)    # Rojo claro
    CIAN = (0, 0.7, 0.8)          # Cian oscuro
    VIOLETA = (0.6, 0.3, 0.8)     # Violeta oscuro


@dataclass
class CodigoEncontrado:
    """Representa un código encontrado en el PDF."""
    codigo: str
    codigo_buscado: str  # El código original que se buscó
    pagina: int
    rect: Tuple[float, float, float, float]  # x0, y0, x1, y1
    texto_contexto: str = ""


@dataclass
class ResultadoResaltado:
    """Resultado del proceso de resaltado."""
    pdf_bytes: bytes
    total_codigos_buscados: int
    codigos_encontrados: int
    codigos_no_encontrados: List[str]
    detalle_por_pagina: Dict[int, List[str]]
    detalle_encontrados: Dict[str, List[CodigoEncontrado]]
    resumen: str
    paginas_originales: int  # Número de páginas del documento original


class PDFHighlighter:
    """
    Servicio para resaltar códigos en documentos PDF.
    
    IMPORTANTE: Este servicio preserva la integridad del documento original.
    Solo agrega anotaciones de resaltado (highlight annotations) sin modificar
    el contenido, estructura o metadatos del PDF original.
    
    Funcionalidades:
    - Busca códigos en el texto del PDF
    - Resalta con colores configurables usando ANOTACIONES
    - NO modifica el contenido del documento
    - NO agrega páginas adicionales
    - Preserva la validez legal del documento
    """
    
    def __init__(
        self,
        color_resaltado: ColorResaltado = ColorResaltado.ROJO,
        opacidad: float = 0.35,  # Opacidad más baja para resaltado sutil
    ):
        """
        Inicializa el highlighter.
        
        Args:
            color_resaltado: Color para resaltar (ROJO por defecto para visibilidad)
            opacidad: Opacidad del resaltado (0-1). 0.35 = sutil pero visible
        """
        self.color = color_resaltado.value
        self.opacidad = opacidad
        
        logger.info(
            f"PDFHighlighter inicializado (color: {color_resaltado.name}, "
            f"opacidad: {opacidad})"
        )
    
    def resaltar_codigos(
        self,
        pdf_input: Union[str, Path, bytes],
        codigos: List[str],
        color: Optional[ColorResaltado] = None,
    ) -> ResultadoResaltado:
        """
        Resalta códigos en un PDF usando SOLO anotaciones.
        
        IMPORTANTE: Este método preserva la integridad del documento.
        NO agrega páginas, NO modifica contenido, solo agrega anotaciones.
        
        ARQUITECTURA v3.0:
        1. Preprocesa PDF con OCRmyPDF (agrega capa de texto OCR)
        2. Busca códigos con matching difuso (tolera errores de OCR)
        3. Resalta usando coordenadas exactas
        
        Args:
            pdf_input: Ruta al PDF o bytes del PDF
            codigos: Lista de códigos a buscar y resaltar
            color: Color opcional (usa el predeterminado si no se especifica)
            
        Returns:
            ResultadoResaltado con el PDF anotado y estadísticas
        """
        import time
        start_time = time.time()
        
        # Obtener bytes del PDF
        if isinstance(pdf_input, bytes):
            pdf_bytes = pdf_input
        else:
            with open(str(pdf_input), 'rb') as f:
                pdf_bytes = f.read()
        
        # Preprocesar con OCRmyPDF para obtener texto + coordenadas
        ocr_result = None
        palabras_por_pagina = {}
        
        if OCR_SERVICE_AVAILABLE:
            try:
                logger.info("Preprocesando PDF con OCRmyPDF...")
                ocr_result = process_pdf_with_ocr(pdf_bytes, force_ocr=False)
                logger.info(f"OCR completado: {ocr_result.total_words} palabras en {ocr_result.processing_time_ms:.0f}ms")
                
                # Extraer palabras por página
                for page_result in ocr_result.pages:
                    palabras_por_pagina[page_result.page_number - 1] = [
                        {
                            'texto': w.text,
                            'x': w.x,
                            'y': w.y,
                            'w': w.width,
                            'h': w.height
                        }
                        for w in page_result.words
                    ]
            except Exception as e:
                logger.warning(f"Error en OCRmyPDF: {e}")
        
        # Abrir documento
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        paginas_originales = len(doc)
        color_usar = color.value if color else self.color
        
        # Preparar códigos
        codigos_originales = set(c.strip() for c in codigos if c.strip())
        
        # Estructuras para resultados
        encontrados: Dict[str, List[CodigoEncontrado]] = {}
        detalle_por_pagina: Dict[int, List[str]] = {}
        
        # Procesar cada página
        for pagina_num in range(len(doc)):
            pagina = doc[pagina_num]
            palabras_ocr = palabras_por_pagina.get(pagina_num, [])
            
            logger.info(f"Procesando página {pagina_num + 1}/{paginas_originales} ({len(palabras_ocr)} palabras OCR)")
            
            codigos_en_pagina = []
            
            for codigo in codigos_originales:
                # Saltar si ya encontramos este código
                if codigo in encontrados:
                    continue
                
                codigo_clean = codigo.upper().replace('-', '').replace(' ', '')
                rect = None
                texto_encontrado = None
                fuente = None
                
                # ESTRATEGIA 1: Búsqueda nativa PyMuPDF (coordenadas exactas)
                # Intentar buscar directamente en el texto del PDF
                variaciones_buscar = [codigo, codigo.upper(), codigo_clean]
                for var in variaciones_buscar:
                    rects_nativos = pagina.search_for(var)
                    if rects_nativos:
                        rect = rects_nativos[0]  # Usar el primer resultado
                        texto_encontrado = var
                        fuente = "nativo"
                        logger.info(f"✓ '{codigo}' encontrado via búsqueda nativa (rect: {rect})")
                        break
                
                # ESTRATEGIA 2: Si no encontró con búsqueda nativa, usar OCR palabra por palabra
                if rect is None:
                    for palabra in palabras_ocr:
                        # Limpiar: quitar TODOS los caracteres no alfanuméricos
                        palabra_clean = re.sub(r'[^A-Z0-9]', '', palabra['texto'].upper())
                        
                        # Matching exacto o difuso
                        if palabra_clean == codigo_clean or self._codigos_similares(codigo_clean, palabra_clean):
                            x = palabra['x']
                            y = palabra['y']
                            w = palabra['w']
                            h = palabra['h']
                            
                            # AJUSTE INTELIGENTE para coordenadas OCR:
                            # Algunos PDFs escaneados tienen bounding boxes muy altos
                            # Si la altura es mayor a 8 pixels, ajustar proporcionalmente
                            
                            altura_ideal = 7.0  # Altura óptima basada en PDFs bien procesados
                            
                            if h > 9:  # Si el rectángulo es muy alto (>9px)
                                # Reducir altura al ideal
                                h_ajustado = altura_ideal
                                diferencia = h - altura_ideal
                                offset = diferencia * 0.3
                                y_ajustado = y - altura_ideal - offset
                            else:
                                # Altura normal, usar coordenadas originales
                                h_ajustado = h
                                y_ajustado = y - h
                            
                            rect = fitz.Rect(x, y_ajustado, x + w, y_ajustado + h_ajustado)
                            texto_encontrado = palabra['texto']
                            fuente = "OCR"
                            logger.info(f"✓ '{codigo}' encontrado como '{texto_encontrado}' via OCR (rect: {rect}, h_orig={h:.1f}, h_adj={h_ajustado:.1f})")
                            break
                
                # ESTRATEGIA 3: Búsqueda avanzada OCR (combina palabras consecutivas, fuzzy, prefijo+número)
                if rect is None and palabras_ocr:
                    rect = self._buscar_coordenadas_ocr(codigo, palabras_ocr, pagina)
                    if rect is not None:
                        texto_encontrado = codigo
                        fuente = "OCR-avanzado"
                        logger.info(f"✓ '{codigo}' encontrado via búsqueda OCR avanzada (rect: {rect})")
                
                # ESTRATEGIA 4: EasyOCR (deep learning, más preciso para escaneados)
                if rect is None and EASYOCR_AVAILABLE:
                    try:
                        easyocr_svc = get_easyocr_service()
                        rect = self._buscar_codigo_easyocr(pagina, codigo, service=easyocr_svc)
                        if rect is not None:
                            texto_encontrado = codigo
                            fuente = "EasyOCR"
                            logger.info(f"✓ '{codigo}' encontrado via EasyOCR (rect: {rect})")
                    except Exception as e:
                        logger.warning(f"Error en EasyOCR para '{codigo}': {e}")
                
                # ESTRATEGIA 5: Fallback pytesseract OCR directo (si OCRmyPDF no dio resultados)
                if rect is None and not palabras_ocr:
                    rect = self._buscar_codigo_legacy(pagina, codigo, pagina_num)
                    if rect is not None:
                        texto_encontrado = codigo
                        fuente = "legacy-OCR"
                        logger.info(f"✓ '{codigo}' encontrado via legacy OCR (rect: {rect})")
                
                # Log de diagnóstico si no se encontró
                if rect is None:
                    # Mostrar las palabras OCR que contienen parte del código para depuración
                    codigo_prefix = codigo_clean[:2] if len(codigo_clean) >= 2 else codigo_clean
                    palabras_similares = [
                        p['texto'] for p in palabras_ocr
                        if codigo_prefix in re.sub(r'[^A-Z0-9]', '', p['texto'].upper())
                    ][:10]
                    logger.warning(
                        f"✗ '{codigo}' NO encontrado en página {pagina_num + 1}. "
                        f"Palabras OCR con prefijo '{codigo_prefix}': {palabras_similares}"
                    )
                
                # Si encontró, resaltar
                if rect is not None and rect.width > 0 and rect.height > 0:
                    highlight = pagina.add_highlight_annot(rect)
                    highlight.set_colors(stroke=color_usar)
                    highlight.set_opacity(self.opacidad)
                    highlight.update()
                    
                    if codigo not in encontrados:
                        encontrados[codigo] = []
                    
                    encontrados[codigo].append(CodigoEncontrado(
                        codigo=texto_encontrado or codigo,
                        codigo_buscado=codigo,
                        pagina=pagina_num + 1,
                        rect=(rect.x0, rect.y0, rect.x1, rect.y1),
                        texto_contexto=""
                    ))
                    
                    if codigo not in codigos_en_pagina:
                        codigos_en_pagina.append(codigo)
                    
                    logger.info(f"✓ Código '{codigo}' resaltado en página {pagina_num + 1} (fuente: {fuente})")
            
            if codigos_en_pagina:
                detalle_por_pagina[pagina_num + 1] = codigos_en_pagina
        
        # Códigos no encontrados
        no_encontrados = list(codigos_originales - set(encontrados.keys()))
        
        # Guardar PDF
        pdf_bytes_resultado = doc.tobytes()
        doc.close()
        
        # Verificar integridad
        doc_verificar = fitz.open(stream=pdf_bytes_resultado, filetype="pdf")
        if len(doc_verificar) != paginas_originales:
            logger.error(f"ERROR: Páginas cambiaron de {paginas_originales} a {len(doc_verificar)}")
            raise ValueError("Error de integridad")
        doc_verificar.close()
        
        # Tiempo total
        total_time_ms = (time.time() - start_time) * 1000
        
        resumen = self._generar_resumen(
            len(codigos_originales), len(encontrados), encontrados, no_encontrados
        )
        
        logger.info(f"Resaltado completado en {total_time_ms:.0f}ms: "
                   f"{len(encontrados)}/{len(codigos_originales)} códigos encontrados")
        
        return ResultadoResaltado(
            pdf_bytes=pdf_bytes_resultado,
            total_codigos_buscados=len(codigos_originales),
            codigos_encontrados=len(encontrados),
            codigos_no_encontrados=no_encontrados,
            detalle_por_pagina=detalle_por_pagina,
            detalle_encontrados=encontrados,
            resumen=resumen,
            paginas_originales=paginas_originales
        )
    
    def _buscar_codigo_nativo(self, pagina: fitz.Page, codigo: str) -> Optional[fitz.Rect]:
        """
        Busca un código usando la búsqueda nativa de PyMuPDF.
        
        Intenta múltiples variaciones del código.
        """
        codigo_clean = codigo.upper().replace('-', '').replace(' ', '')
        
        # Variaciones a probar
        variaciones = [
            codigo,
            codigo.upper(),
            codigo_clean,
            self._insertar_separadores(codigo_clean, '-'),
            self._insertar_separadores(codigo_clean, ' '),
        ]
        
        for var in variaciones:
            rects = pagina.search_for(var, quads=False)
            if rects:
                logger.debug(f"Encontrado '{codigo}' como '{var}' via búsqueda nativa")
                return rects[0]
        
        return None
    
    def _buscar_codigo_easyocr(
        self, 
        pagina: fitz.Page, 
        codigo: str,
        service: Optional['EasyOCRService'] = None
    ) -> Optional[fitz.Rect]:
        """
        Busca un código usando EasyOCR (deep learning OCR).
        
        EasyOCR proporciona:
        - Alta precisión en reconocimiento de texto
        - Coordenadas exactas de bounding boxes
        - Mejor manejo de documentos escaneados
        """
        if service is None or not service.is_available:
            return None
        
        codigo_clean = codigo.upper().replace('-', '').replace(' ', '')
        
        try:
            # Obtener resultados de EasyOCR
            ocr_result = service.extract_from_pdf_page(pagina, dpi=200)
            
            for word in ocr_result.words:
                word_clean = word.text.upper().replace('-', '').replace(' ', '')
                
                # Coincidencia exacta
                if word_clean == codigo_clean:
                    logger.info(f"✓ EasyOCR encontró '{codigo}' exactamente como '{word.text}'")
                    return fitz.Rect(word.bbox)
                
                # Matching difuso para errores de OCR
                if self._codigos_similares(codigo_clean, word_clean):
                    logger.info(f"✓ EasyOCR encontró '{codigo}' similar a '{word.text}'")
                    return fitz.Rect(word.bbox)
                
                # Código contenido en la palabra
                if codigo_clean in word_clean:
                    logger.info(f"✓ EasyOCR encontró '{codigo}' contenido en '{word.text}'")
                    return fitz.Rect(word.bbox)
            
        except Exception as e:
            logger.warning(f"Error en búsqueda EasyOCR: {e}")
        
        return None
    
    def _buscar_codigo_legacy(
        self, 
        pagina: fitz.Page, 
        codigo: str,
        pagina_num: int
    ) -> Optional[fitz.Rect]:
        """
        Búsqueda legacy usando OCRmyPDF/Tesseract.
        
        Usado como fallback cuando EasyOCR no está disponible.
        """
        # Aplicar OCR a la página
        texto_ocr, palabras_ocr = self._aplicar_ocr_pagina(pagina)
        
        if not palabras_ocr:
            return None
        
        codigo_clean = codigo.upper().replace('-', '').replace(' ', '')
        
        for palabra in palabras_ocr:
            palabra_clean = palabra['texto'].upper().replace('-', '').replace(' ', '')
            
            if self._codigos_similares(codigo_clean, palabra_clean):
                logger.info(f"✓ Legacy OCR encontró '{codigo}' similar a '{palabra['texto']}'")
                return fitz.Rect(
                    palabra['x'],
                    palabra['y'],
                    palabra['x'] + palabra['w'],
                    palabra['y'] + palabra['h']
                )
        
        return None
    
    def _aplicar_resaltado(
        self,
        pagina: fitz.Page,
        rect: fitz.Rect,
        codigo: str,
        color: Tuple[float, float, float]
    ) -> None:
        """
        Aplica el resaltado a un rectángulo en la página.
        """
        # Validar rect
        if rect.width <= 0 or rect.height <= 0:
            logger.warning(f"Rect inválido para {codigo}: {rect}")
            return
        
        # Crear anotación de resaltado
        highlight = pagina.add_highlight_annot(rect)
        highlight.set_colors(stroke=color)
        highlight.set_opacity(self.opacidad)
        highlight.update()
    
    def _generar_variaciones(self, codigo: str) -> List[str]:
        """
        Genera variaciones de un código para búsqueda.
        
        MEJORADO: Genera variaciones considerando errores comunes de OCR
        donde letras se confunden con otras letras o números.
        """
        variaciones = set()
        codigo_upper = codigo.upper()
        codigo_lower = codigo.lower()
        
        # 1. Versiones originales
        variaciones.add(codigo)
        variaciones.add(codigo_upper)
        variaciones.add(codigo_lower)
        
        # 2. Versión sin separadores (normalizada)
        codigo_limpio = re.sub(r'[\s\-_./]', '', codigo_upper)
        variaciones.add(codigo_limpio)
        variaciones.add(codigo_limpio.lower())
        
        # 3. Versiones con diferentes separadores en transiciones letra-número
        version_guion = self._insertar_separadores(codigo_limpio, '-')
        version_espacio = self._insertar_separadores(codigo_limpio, ' ')
        if version_guion != codigo_limpio:
            variaciones.add(version_guion)
            variaciones.add(version_guion.lower())
        if version_espacio != codigo_limpio:
            variaciones.add(version_espacio)
            variaciones.add(version_espacio.lower())
        
        # 4. Variaciones por errores comunes de OCR (letra <-> letra/número)
        # Mapeo bidireccional de confusiones comunes de OCR
        confusiones_ocr = {
            'P': ['F', 'R', '+', 'D'],  # P se confunde con F, R, +, D
            'J': ['I', 'L', '1', 'T', 'J'],  # J se confunde con I, L, 1, T
            'G': ['6', 'C', 'O', 'B', '0', 'Q'],  # G se confunde con 6, C, O, B, 0, Q
            'S': ['5', '3'],           # S se confunde con 5, 3
            'B': ['8', 'R', '6'],      # B se confunde con 8, R, 6
            'O': ['0', 'Q', 'D', '8'],  # O se confunde con 0, Q, D, 8
            'I': ['1', 'L', 'J', 'T'], # I se confunde con 1, L, J, T
            'Z': ['2'],                # Z se confunde con 2
            'A': ['4'],                # A se confunde con 4
            'E': ['3'],                # E se confunde con 3
            'T': ['7', 'I'],           # T se confunde con 7, I
            '0': ['O', 'Q'],           # 0 se confunde con O, Q
            '1': ['I', 'L'],           # 1 se confunde con I, L
            '8': ['B', 'O', '0'],      # 8 se confunde con B, O, 0
            '6': ['G', 'B'],           # 6 se confunde con G, B
            '+': ['P', 'T'],           # + a veces es P o T mal leído
        }
        
        # Generar variaciones reemplazando cada carácter confundible
        match = re.match(r'^([A-Z]+)(\d+)$', codigo_limpio)
        if match:
            letras, numeros = match.groups()
            
            # Generar combinaciones de letras confundidas
            def generar_combinaciones(texto, idx=0, actual=""):
                if idx == len(texto):
                    return [actual]
                
                char = texto[idx]
                resultados = []
                
                # Agregar el carácter original
                resultados.extend(generar_combinaciones(texto, idx + 1, actual + char))
                
                # Agregar confusiones si existen (limitar a 2 confusiones por carácter)
                if char in confusiones_ocr:
                    for conf in confusiones_ocr[char][:2]:
                        resultados.extend(generar_combinaciones(texto, idx + 1, actual + conf))
                
                return resultados
            
            # Generar variaciones de las letras (limitadas para no explotar)
            variaciones_letras = generar_combinaciones(letras)[:20]  # Max 20 variaciones
            
            for var_letras in variaciones_letras:
                variacion = var_letras + numeros
                if variacion != codigo_limpio:
                    variaciones.add(variacion)
                    variaciones.add(variacion.lower())
            
            logger.debug(f"Variaciones OCR para {codigo_limpio}: {len(variaciones_letras)} generadas")
        
        return list(variaciones)
    
    def _insertar_separadores(self, codigo: str, separador: str) -> str:
        """Inserta separadores en transiciones letra-número."""
        if not codigo:
            return codigo
        
        resultado = [codigo[0]]
        for i in range(1, len(codigo)):
            char_actual = codigo[i]
            char_anterior = codigo[i - 1]
            
            if (char_anterior.isalpha() and char_actual.isdigit()) or \
               (char_anterior.isdigit() and char_actual.isalpha()):
                resultado.append(separador)
            
            resultado.append(char_actual)
        
        return "".join(resultado)
    
    def _codigos_similares(self, codigo1: str, codigo2: str) -> bool:
        """
        Compara dos códigos considerando errores comunes de OCR.
        
        IMPORTANTE: Esta función busca el código dentro de la palabra OCR,
        ya que el OCR a veces concatena o fragmenta texto.
        
        Args:
            codigo1: Código buscado (ej: PJG777)
            codigo2: Código encontrado por OCR (ej: +JG777, REF:+JG777)
            
        Returns:
            True si los códigos son similares considerando errores OCR
        """
        # Mapeo de caracteres equivalentes por errores OCR
        equivalentes = {
            'P': {'P', 'F', 'R', '+', 'D'},
            'J': {'J', 'I', 'L', '1', 'T', '3'},  # J puede verse como 3
            'G': {'G', '6', 'C', 'O', 'B', '0', 'Q'},
            'S': {'S', '5', '3'},
            'B': {'B', '8', 'R', '6'},
            'O': {'O', '0', 'Q', 'D', '8'},
            'I': {'I', '1', 'L', 'J', 'T'},
            '8': {'8', 'B', 'O', '0'},
            '0': {'0', 'O', 'Q'},
            '1': {'1', 'I', 'L'},
            '6': {'6', 'G', 'B'},
            '+': {'+', 'P', 'T'},
            '3': {'3', 'S', 'J'},  # 3 puede ser S o J
            '5': {'5', 'S'},
        }
        
        def _compara_exacta(c1: str, c2: str) -> bool:
            """Compara dos strings de igual longitud"""
            if len(c1) != len(c2):
                return False
            for char1, char2 in zip(c1, c2):
                if char1 == char2:
                    continue
                equiv_c1 = equivalentes.get(char1, {char1})
                equiv_c2 = equivalentes.get(char2, {char2})
                if char2 not in equiv_c1 and char1 not in equiv_c2:
                    return False
            return True
        
        # Si tienen igual longitud, comparar directamente
        if len(codigo1) == len(codigo2):
            return _compara_exacta(codigo1, codigo2)
        
        # Si codigo2 es más largo, buscar codigo1 dentro de codigo2
        # Esto maneja casos como "REF:+JG777" o "+JG777 " 
        if len(codigo2) > len(codigo1):
            for i in range(len(codigo2) - len(codigo1) + 1):
                substring = codigo2[i:i + len(codigo1)]
                if _compara_exacta(codigo1, substring):
                    return True
        
        return False
    
    def _aplicar_ocr_pagina(self, pagina: fitz.Page) -> tuple[Optional[str], Optional[list]]:
        """
        Aplica OCR a una página del PDF para extraer texto de imágenes.
        
        NOTA: Este es un método FALLBACK. El procesamiento principal usa
        OCRmyPDF a través del OCR Service para mejor rendimiento.
        
        Solo se usa cuando:
        - OCR Service no está disponible
        - Hay error en el procesamiento OCRmyPDF
        - Se necesita revalidar una página específica
        
        Args:
            pagina: Página del PDF (posiblemente escaneada)
            
        Returns:
            Tupla (texto extraído, lista de palabras con coordenadas) o (None, None) si falla
        """
        if not PYTESSERACT_AVAILABLE:
            logger.warning("pytesseract no disponible para OCR fallback")
            return (None, None)
        
        try:
            import pytesseract
            from PIL import ImageEnhance
            
            # Convertir página a imagen con resolución 2x (balance velocidad/calidad)
            zoom = 2
            mat = fitz.Matrix(zoom, zoom)
            pix = pagina.get_pixmap(matrix=mat)
            img_data = pix.tobytes('png')
            
            # Abrir con PIL
            img = Image.open(io.BytesIO(img_data))
            
            # Preprocesamiento para mejorar OCR
            # 1. Convertir a escala de grises
            img_gray = img.convert('L')
            
            # 2. Aumentar contraste
            enhancer = ImageEnhance.Contrast(img_gray)
            img_contrast = enhancer.enhance(2.0)
            
            # 3. Binarizar (umbral)
            img_bin = img_contrast.point(lambda x: 0 if x < 150 else 255, '1')
            
            # Aplicar OCR UNA SOLA VEZ con datos de posición (incluye el texto)
            ocr_data = pytesseract.image_to_data(
                img_bin, 
                lang='spa+eng', 
                config='--psm 6',
                output_type=pytesseract.Output.DICT,
                timeout=30  # Timeout de 30 segundos para evitar bloqueos
            )
            
            # Construir texto completo desde los datos
            texto = ' '.join([t for t in ocr_data['text'] if t.strip()])
            
            # Construir lista de palabras con coordenadas (ajustadas al tamaño original)
            palabras_coords = []
            for i in range(len(ocr_data['text'])):
                palabra = ocr_data['text'][i].strip()
                if palabra:
                    # Ajustar coordenadas del zoom al tamaño original de la página
                    x = ocr_data['left'][i] / zoom
                    y = ocr_data['top'][i] / zoom
                    w = ocr_data['width'][i] / zoom
                    h = ocr_data['height'][i] / zoom
                    palabras_coords.append({
                        'texto': palabra,
                        'x': x,
                        'y': y,
                        'w': w,
                        'h': h
                    })
            
            logger.debug(f"OCR extrajo {len(texto)} caracteres y {len(palabras_coords)} palabras con coordenadas")
            return (texto if texto.strip() else None, palabras_coords if palabras_coords else None)
            
        except Exception as e:
            logger.warning(f"Error aplicando OCR: {e}")
            return (None, None)
    
    def _buscar_en_ocr(self, codigo: str, texto_ocr: str) -> bool:
        """
        Busca un código en texto OCR con tolerancia a errores comunes.
        
        El OCR puede confundir caracteres y producir símbolos inesperados.
        Usa múltiples estrategias de búsqueda difusa.
        
        Args:
            codigo: Código a buscar
            texto_ocr: Texto extraído por OCR
            
        Returns:
            True si se encontró el código (exacto o con tolerancia)
        """
        codigo_upper = codigo.upper()
        texto_upper = texto_ocr.upper()
        
        # Búsqueda exacta primero
        if codigo_upper in texto_upper:
            logger.debug(f"Código {codigo} encontrado exactamente")
            return True
        
        # Búsqueda sin separadores
        codigo_limpio = re.sub(r'[^A-Z0-9]', '', codigo_upper)
        texto_limpio = re.sub(r'[^A-Z0-9]', '', texto_upper)
        if codigo_limpio in texto_limpio:
            logger.debug(f"Código {codigo} encontrado sin separadores")
            return True
        
        # Estrategia 3: Búsqueda con tolerancia OCR para CUALQUIER código
        # Generar patrón regex flexible que permita confusiones de OCR
        patron_ocr = self._generar_patron_ocr_flexible(codigo_limpio)
        if re.search(patron_ocr, texto_upper):
            logger.debug(f"Código {codigo} encontrado via patrón OCR flexible: {patron_ocr}")
            return True
        
        # Extraer solo las partes alfabéticas y numéricas del código
        # Por ejemplo: SM-055 -> prefijo="SM", sufijo="055"
        match = re.match(r'^([A-Za-z]+)[-_.\s]*(\d+)$', codigo.strip())
        if match:
            prefijo = match.group(1).upper()
            sufijo = match.group(2)
            
            # Estrategia 1: Buscar REF: PREFIJO-algo
            # En manifiestos DIAN, los códigos aparecen como "REF: SM-055"
            patron_ref = rf'REF[:\s]*{prefijo}[-\s]*[^\s,]+'
            resultados_ref = re.findall(patron_ref, texto_upper)
            if resultados_ref:
                # Verificar si alguno de los encontrados tiene el sufijo correcto (con tolerancia)
                for encontrado in resultados_ref:
                    # Extraer la parte después del prefijo
                    idx = encontrado.upper().find(prefijo) + len(prefijo)
                    resto = re.sub(r'^[-\s]+', '', encontrado[idx:])
                    
                    if len(resto) >= len(sufijo) - 1:  # Permitir que falte 1 carácter
                        # Verificar similitud
                        coincidencias = self._contar_coincidencias_ocr(sufijo, resto[:len(sufijo)+1])
                        ratio = coincidencias / len(sufijo)
                        logger.debug(f"Código {codigo}: encontrado '{encontrado}', resto='{resto}', ratio={ratio:.2f}")
                        if ratio >= 0.33:  # Al menos 1/3 de similitud (muy permisivo)
                            logger.debug(f"Código {codigo} encontrado via patrón REF")
                            return True
            
            # Estrategia 2: Buscar PREFIJO + separador + algo numérico
            for m in re.finditer(re.escape(prefijo), texto_upper):
                pos = m.end()
                # Tomar ventana después del prefijo
                ventana = texto_upper[pos:pos+len(sufijo)+10]
                # Eliminar separadores comunes al inicio
                ventana_limpia = re.sub(r'^[\s\-_.:,;]+', '', ventana)
                
                if len(ventana_limpia) >= max(1, len(sufijo) - 1):
                    # Tomar los primeros caracteres que no sean espacios
                    candidato_match = re.match(r'[^\s,]+', ventana_limpia)
                    if candidato_match:
                        candidato = candidato_match.group()
                        coincidencias = self._contar_coincidencias_ocr(sufijo, candidato)
                        ratio = coincidencias / len(sufijo) if len(sufijo) > 0 else 0
                        logger.debug(f"Código {codigo}: prefijo encontrado, candidato='{candidato}', ratio={ratio:.2f}")
                        if ratio >= 0.33:  # Muy permisivo para OCR malo
                            logger.debug(f"Código {codigo} encontrado via búsqueda de prefijo")
                            return True
        
        return False
    
    def _generar_patron_ocr_flexible(self, codigo: str) -> str:
        """
        Genera un patrón regex que acepta confusiones comunes de OCR para cada carácter.
        Por ejemplo: BX03D -> [B8][X][0OQC][3][D0OQC]
        """
        patron = []
        for c in codigo.upper():
            # Mapeo de cada carácter a sus posibles confusiones OCR
            if c in '0':
                patron.append('[0OQDCoq°]')
            elif c in 'O':
                patron.append('[O0QDCoq°]')
            elif c in 'D':
                patron.append('[D0OQCdoq]')
            elif c in '1':
                patron.append('[1IilL|!]')
            elif c in 'I':
                patron.append('[I1ilL|!]')
            elif c in 'L':
                patron.append('[L1IilL|!]')
            elif c in '5':
                patron.append('[5Ss$£]')
            elif c in 'S':
                patron.append('[S5s$£]')
            elif c in '6':
                patron.append('[6Gg€ÉéEB]')
            elif c in 'G':
                patron.append('[G6g€ÉéEB9]')
            elif c in '8':
                patron.append('[8B&b]')
            elif c in 'B':
                patron.append('[B8&b6]')
            elif c in '2':
                patron.append('[2Zz]')
            elif c in 'Z':
                patron.append('[Z2z]')
            elif c in '9':
                patron.append('[9GgQq]')
            elif c in 'Q':
                patron.append('[Q9Gg0Oq]')
            elif c in '3':
                patron.append('[3]')  # 3 raramente se confunde
            elif c in '4':
                patron.append('[4Aa]')
            elif c in '7':
                patron.append('[7]')  # 7 raramente se confunde
            elif c in 'X':
                patron.append('[Xx]')  # X generalmente es claro
            else:
                # Para otros caracteres, permitir el mismo en mayúscula/minúscula
                patron.append(f'[{c}{c.lower()}]' if c.isalpha() else re.escape(c))
        
        # Permitir separadores opcionales entre caracteres
        return '.?'.join(patron)
    
    def _contar_coincidencias_ocr(self, esperado: str, encontrado: str) -> int:
        """
        Cuenta cuántos caracteres coinciden entre lo esperado y encontrado,
        considerando confusiones comunes de OCR.
        """
        coincidencias = 0
        encontrado_upper = encontrado.upper()
        
        for i, c_esperado in enumerate(esperado):
            if i < len(encontrado_upper):
                c_encontrado = encontrado_upper[i]
                if c_esperado == c_encontrado or self._son_similares_ocr(c_esperado, c_encontrado):
                    coincidencias += 1
        
        return coincidencias
    
    def _son_similares_ocr(self, c1: str, c2: str) -> bool:
        """Verifica si dos caracteres son confusiones comunes de OCR."""
        c1, c2 = c1.upper(), c2.upper()
        
        # Grupos de caracteres que el OCR confunde frecuentemente
        grupos_confusion = [
            {'0', 'O', 'Q', 'D', 'C', '°'},
            {'1', 'I', 'L', '|', '!'},
            {'5', 'S', '$', '£'},
            {'6', 'G', '€', 'É', 'E', 'B'},
            {'8', 'B', '&'},
            {'2', 'Z'},
            {'9', 'G', 'Q'},
        ]
        
        for grupo in grupos_confusion:
            if c1 in grupo and c2 in grupo:
                return True
        return False
    
    def _buscar_coordenadas_ocr(
        self, 
        codigo: str, 
        palabras_ocr: Optional[list],
        pagina: fitz.Page
    ) -> Optional[fitz.Rect]:
        """
        Busca las coordenadas de un código en los datos OCR.
        
        Args:
            codigo: Código a buscar
            palabras_ocr: Lista de palabras con coordenadas del OCR
            pagina: Página del PDF para crear el rectángulo
            
        Returns:
            Rectángulo donde se encontró el código, o None
        """
        if not palabras_ocr:
            return None
        
        codigo_upper = codigo.upper()
        codigo_limpio = re.sub(r'[^A-Z0-9]', '', codigo_upper)
        
        # ESTRATEGIA 1: Buscar coincidencia EXACTA primero (máxima prioridad)
        for palabra in palabras_ocr:
            texto_palabra = palabra['texto'].upper()
            texto_limpio = re.sub(r'[^A-Z0-9]', '', texto_palabra)
            
            # Coincidencia exacta
            if codigo_upper in texto_palabra or codigo_limpio in texto_limpio:
                rect = fitz.Rect(
                    palabra['x'],
                    palabra['y'],
                    palabra['x'] + palabra['w'],
                    palabra['y'] + palabra['h']
                )
                logger.debug(f"Coordenadas OCR encontradas para {codigo}: {rect}")
                return rect
        
        # ESTRATEGIA 2: Buscar en combinaciones de palabras consecutivas
        # Esto es importante porque OCR puede separar "SM-056" en "SM" y "056"
        for i, palabra in enumerate(palabras_ocr):
            texto_combinado = palabra['texto'].upper()
            texto_combinado_limpio = re.sub(r'[^A-Z0-9]', '', texto_combinado)
            
            # Combinar con palabras siguientes en la misma línea
            x_min = palabra['x']
            y_min = palabra['y']
            x_max = palabra['x'] + palabra['w']
            y_max = palabra['y'] + palabra['h']
            
            for j in range(i + 1, min(i + 4, len(palabras_ocr))):
                siguiente = palabras_ocr[j]
                # Solo si está en la misma línea (similar Y) y cerca horizontalmente
                if abs(siguiente['y'] - y_min) < 15 and (siguiente['x'] - x_max) < 50:
                    texto_combinado += siguiente['texto'].upper()
                    texto_combinado_limpio += re.sub(r'[^A-Z0-9]', '', siguiente['texto'].upper())
                    x_max = siguiente['x'] + siguiente['w']
                    y_max = max(y_max, siguiente['y'] + siguiente['h'])
                    
                    # Verificar si el código está en la combinación
                    if codigo_limpio in texto_combinado_limpio:
                        rect = fitz.Rect(x_min, y_min, x_max, y_max)
                        logger.debug(f"Coordenadas OCR (combinación) para {codigo}: {rect}")
                        return rect
                else:
                    break
        
        # ESTRATEGIA 3: Buscar con tolerancia OCR ALTA (solo si no encontró exacto)
        # Requiere ratio >= 0.8 (80% similitud) para evitar falsos positivos
        mejor_match = None
        mejor_ratio = 0.0
        
        for palabra in palabras_ocr:
            texto_palabra = palabra['texto'].upper()
            texto_limpio = re.sub(r'[^A-Z0-9]', '', texto_palabra)
            
            # Solo considerar palabras de longitud similar
            if abs(len(texto_limpio) - len(codigo_limpio)) <= 2:
                coincidencias = self._contar_coincidencias_ocr(codigo_limpio, texto_limpio)
                ratio = coincidencias / len(codigo_limpio) if len(codigo_limpio) > 0 else 0
                
                # Requiere 80% de similitud Y que sea mejor que cualquier match anterior
                if ratio >= 0.8 and ratio > mejor_ratio:
                    mejor_ratio = ratio
                    mejor_match = fitz.Rect(
                        palabra['x'],
                        palabra['y'],
                        palabra['x'] + palabra['w'],
                        palabra['y'] + palabra['h']
                    )
        
        if mejor_match:
            logger.debug(f"Coordenadas OCR (tolerancia alta) para {codigo}: {mejor_match}, ratio={mejor_ratio:.2f}")
            return mejor_match
        
        # ESTRATEGIA 4: Buscar por prefijo + número (último recurso)
        # Para códigos como SM-055, buscar "SM" seguido de números
        match = re.match(r'^([A-Za-z]+)[-_.\s]*(\d+)$', codigo.strip())
        if match:
            prefijo = match.group(1).upper()
            sufijo = match.group(2)
            
            for i, palabra in enumerate(palabras_ocr):
                texto_palabra = palabra['texto'].upper()
                
                # Buscar palabra que contenga el prefijo
                if prefijo in texto_palabra or texto_palabra.startswith(prefijo):
                    # Verificar que las siguientes palabras contengan el sufijo
                    x_min = palabra['x']
                    y_min = palabra['y']
                    x_max = palabra['x'] + palabra['w']
                    y_max = palabra['y'] + palabra['h']
                    
                    texto_area = texto_palabra
                    for j in range(i + 1, min(i + 3, len(palabras_ocr))):
                        siguiente = palabras_ocr[j]
                        if abs(siguiente['y'] - y_min) < 15:
                            texto_area += siguiente['texto']
                            x_max = max(x_max, siguiente['x'] + siguiente['w'])
                            y_max = max(y_max, siguiente['y'] + siguiente['h'])
                    
                    # Verificar que el área contenga tanto el prefijo como el sufijo
                    texto_area_limpio = re.sub(r'[^A-Z0-9]', '', texto_area.upper())
                    if prefijo in texto_area_limpio and sufijo in texto_area_limpio:
                        rect = fitz.Rect(x_min - 2, y_min - 2, x_max + 2, y_max + 2)
                        logger.debug(f"Coordenadas OCR (prefijo+sufijo) para {codigo}: {rect}")
                        return rect
        
        return None
    
    def _buscar_texto_en_pagina(
        self,
        pagina: fitz.Page,
        texto: str
    ) -> List[fitz.Rect]:
        """
        Busca texto en una página y retorna los rectángulos.
        
        Args:
            pagina: Página del PDF
            texto: Texto a buscar
            
        Returns:
            Lista de rectángulos donde se encontró el texto
        """
        resultados = []
        
        # Búsqueda case-insensitive
        areas = pagina.search_for(texto, quads=False)
        resultados.extend(areas)
        
        # Si no encuentra, intentar con variaciones
        if not areas:
            # Intentar sin espacios extras
            texto_compacto = ' '.join(texto.split())
            if texto_compacto != texto:
                areas = pagina.search_for(texto_compacto, quads=False)
                resultados.extend(areas)
        
        return resultados
    
    def _extraer_contexto(self, texto: str, codigo: str, chars: int = 50) -> str:
        """Extrae contexto alrededor del código."""
        try:
            idx = texto.upper().find(codigo.upper())
            if idx == -1:
                return ""
            
            inicio = max(0, idx - chars)
            fin = min(len(texto), idx + len(codigo) + chars)
            contexto = texto[inicio:fin].strip()
            
            # Limpiar saltos de línea
            contexto = ' '.join(contexto.split())
            
            return f"...{contexto}..."
        except Exception:
            return ""
    
    def generar_reporte_pdf(
        self,
        resultado: ResultadoResaltado,
        nombre_documento: str = "Documento",
    ) -> bytes:
        """
        Genera un PDF de REPORTE separado con el índice de códigos.
        
        IMPORTANTE: Este es un documento NUEVO y SEPARADO del original.
        NO modifica ni se inserta en el documento legal original.
        
        Args:
            resultado: ResultadoResaltado de una búsqueda previa
            nombre_documento: Nombre del documento procesado
            
        Returns:
            bytes del PDF de reporte
        """
        # Crear documento nuevo para el reporte
        doc = fitz.open()
        
        # Crear página A4
        pagina = doc.new_page(width=595, height=842)
        
        font_titulo = "helv"
        font_normal = "helv"
        
        y = 50
        margen = 50
        
        # Título
        pagina.insert_text(
            (margen, y),
            "REPORTE DE BÚSQUEDA DE CÓDIGOS",
            fontsize=16,
            fontname=font_titulo,
            color=(0, 0, 0)
        )
        y += 25
        
        # Subtítulo con nombre del documento
        pagina.insert_text(
            (margen, y),
            f"Documento: {nombre_documento}",
            fontsize=11,
            fontname=font_normal,
            color=(0.3, 0.3, 0.3)
        )
        y += 20
        
        # Fecha y hora
        fecha = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        pagina.insert_text(
            (margen, y),
            f"Fecha de procesamiento: {fecha}",
            fontsize=10,
            fontname=font_normal,
            color=(0.4, 0.4, 0.4)
        )
        y += 25
        
        # Línea separadora
        pagina.draw_line(
            (margen, y),
            (595 - margen, y),
            color=(0.7, 0.7, 0.7),
            width=0.5
        )
        y += 15
        
        # Resumen estadístico
        pagina.insert_text(
            (margen, y),
            "RESUMEN:",
            fontsize=12,
            fontname=font_titulo,
            color=(0, 0, 0)
        )
        y += 18
        
        stats = [
            f"• Códigos buscados: {resultado.total_codigos_buscados}",
            f"• Códigos encontrados: {resultado.codigos_encontrados}",
            f"• Códigos no encontrados: {len(resultado.codigos_no_encontrados)}",
            f"• Porcentaje de éxito: {(resultado.codigos_encontrados/resultado.total_codigos_buscados*100):.1f}%",
            f"• Páginas del documento: {resultado.paginas_originales}",
        ]
        
        for stat in stats:
            pagina.insert_text(
                (margen + 10, y),
                stat,
                fontsize=10,
                fontname=font_normal,
                color=(0, 0, 0)
            )
            y += 15
        
        y += 10
        
        # Códigos encontrados
        if resultado.detalle_encontrados:
            pagina.insert_text(
                (margen, y),
                "CÓDIGOS ENCONTRADOS:",
                fontsize=12,
                fontname=font_titulo,
                color=(0, 0.5, 0)
            )
            y += 20
            
            for codigo, ubicaciones in sorted(resultado.detalle_encontrados.items()):
                if y > 780:
                    pagina = doc.new_page(width=595, height=842)
                    y = 50
                
                paginas = sorted(set(u.pagina for u in ubicaciones))
                paginas_str = ", ".join(str(p) for p in paginas)
                frecuencia = len(ubicaciones)
                
                # Cuadro verde
                rect = fitz.Rect(margen, y - 10, margen + 8, y - 2)
                pagina.draw_rect(rect, color=(0, 0.7, 0), fill=(0, 0.7, 0))
                
                pagina.insert_text(
                    (margen + 15, y),
                    f"{codigo}",
                    fontsize=10,
                    fontname=font_normal,
                    color=(0, 0, 0)
                )
                
                pagina.insert_text(
                    (300, y),
                    f"Pág: {paginas_str} ({frecuencia}x)",
                    fontsize=9,
                    fontname=font_normal,
                    color=(0.4, 0.4, 0.4)
                )
                
                y += 16
        
        # Códigos no encontrados
        if resultado.codigos_no_encontrados:
            y += 10
            
            if y > 750:
                pagina = doc.new_page(width=595, height=842)
                y = 50
            
            pagina.insert_text(
                (margen, y),
                "CÓDIGOS NO ENCONTRADOS:",
                fontsize=12,
                fontname=font_titulo,
                color=(0.8, 0, 0)
            )
            y += 20
            
            for codigo in sorted(resultado.codigos_no_encontrados):
                if y > 780:
                    pagina = doc.new_page(width=595, height=842)
                    y = 50
                
                # Cuadro rojo
                rect = fitz.Rect(margen, y - 10, margen + 8, y - 2)
                pagina.draw_rect(rect, color=(0.8, 0, 0), fill=(0.8, 0, 0))
                
                pagina.insert_text(
                    (margen + 15, y),
                    codigo,
                    fontsize=10,
                    fontname=font_normal,
                    color=(0.5, 0, 0)
                )
                y += 16
        
        # Nota al pie
        pagina.insert_text(
            (margen, 810),
            "Este reporte es un documento complementario. El documento original no ha sido modificado.",
            fontsize=8,
            fontname=font_normal,
            color=(0.5, 0.5, 0.5)
        )
        pagina.insert_text(
            (margen, 822),
            "Los códigos encontrados están resaltados en el archivo: documento_resaltado.pdf",
            fontsize=8,
            fontname=font_normal,
            color=(0.5, 0.5, 0.5)
        )
        
        pdf_bytes = doc.tobytes()
        doc.close()
        
        return pdf_bytes
    
    # Mantenemos el método anterior como privado y deprecated
    def _agregar_pagina_indice(
        self,
        doc: fitz.Document,
        encontrados: Dict[str, List[CodigoEncontrado]],
        no_encontrados: List[str],
        color: Tuple[float, float, float]
    ):
        """
        DEPRECATED: Este método ya no se usa.
        
        El índice ahora se genera como documento separado usando
        generar_reporte_pdf() para preservar la integridad del
        documento legal original.
        """
        logger.warning(
            "_agregar_pagina_indice está deprecated. "
            "Use generar_reporte_pdf() para crear un reporte separado."
        )
        pass  # No hace nada - preservar integridad del documento
    
    def _generar_resumen(
        self,
        total_buscados: int,
        total_encontrados: int,
        encontrados: Dict[str, List[CodigoEncontrado]],
        no_encontrados: List[str]
    ) -> str:
        """Genera un resumen de texto del proceso."""
        lineas = [
            "=" * 50,
            "RESUMEN DE RESALTADO DE CÓDIGOS",
            "=" * 50,
            "",
            f"Total códigos buscados: {total_buscados}",
            f"Códigos encontrados: {total_encontrados}",
            f"Códigos no encontrados: {len(no_encontrados)}",
            f"Porcentaje de éxito: {(total_encontrados/total_buscados*100):.1f}%",
            "",
        ]
        
        if encontrados:
            lineas.append("ENCONTRADOS:")
            for codigo, ubicaciones in sorted(encontrados.items()):
                paginas = sorted(set(u.pagina for u in ubicaciones))
                lineas.append(f"  ✓ {codigo} - Páginas: {paginas}")
        
        if no_encontrados:
            lineas.append("")
            lineas.append("NO ENCONTRADOS:")
            for codigo in sorted(no_encontrados):
                lineas.append(f"  ✗ {codigo}")
        
        lineas.append("")
        lineas.append("=" * 50)
        
        return "\n".join(lineas)


# Función de conveniencia para uso rápido
def resaltar_codigos_en_pdf(
    pdf_path: Union[str, Path, bytes],
    codigos: List[str],
    color: str = "amarillo",
) -> ResultadoResaltado:
    """
    Función de conveniencia para resaltar códigos en un PDF.
    
    IMPORTANTE: Esta función preserva la integridad del documento original.
    Solo agrega anotaciones de resaltado, no modifica el contenido ni
    agrega páginas al documento legal original.
    
    Args:
        pdf_path: Ruta al PDF o bytes
        codigos: Lista de códigos a resaltar
        color: Color del resaltado (amarillo, verde, rosa, azul, naranja, rojo)
        
    Returns:
        ResultadoResaltado con el PDF anotado y estadísticas
        
    Ejemplo:
        resultado = resaltar_codigos_en_pdf(
            "manifiesto.pdf",
            ["MSCU1234567", "REF-2024-001", "BL-ABC123"],
            color="amarillo"
        )
        
        # Guardar PDF con anotaciones (mismo número de páginas que original)
        with open("manifiesto_resaltado.pdf", "wb") as f:
            f.write(resultado.pdf_bytes)
        
        print(resultado.resumen)
        print(f"Páginas originales preservadas: {resultado.paginas_originales}")
    """
    # Mapear color string a enum
    colores_map = {
        "amarillo": ColorResaltado.AMARILLO,
        "verde": ColorResaltado.VERDE,
        "rosa": ColorResaltado.ROSA,
        "azul": ColorResaltado.AZUL,
        "naranja": ColorResaltado.NARANJA,
        "rojo": ColorResaltado.ROJO,
        "cian": ColorResaltado.CIAN,
        "violeta": ColorResaltado.VIOLETA,
    }
    
    color_enum = colores_map.get(color.lower(), ColorResaltado.AMARILLO)
    
    highlighter = PDFHighlighter(color_resaltado=color_enum)
    
    return highlighter.resaltar_codigos(pdf_path, codigos)


def generar_reporte_separado(
    resultado: ResultadoResaltado,
    nombre_documento: str = "Documento"
) -> bytes:
    """
    Genera un PDF de reporte separado con el índice de códigos.
    
    IMPORTANTE: Este es un documento NUEVO y SEPARADO del original.
    NO modifica ni se inserta en el documento legal original.
    Use esta función después de resaltar_codigos_en_pdf() si necesita
    un reporte/índice de los códigos encontrados.
    
    Args:
        resultado: ResultadoResaltado devuelto por resaltar_codigos_en_pdf()
        nombre_documento: Nombre del documento para mostrar en el reporte
        
    Returns:
        bytes del PDF de reporte
        
    Ejemplo:
        resultado = resaltar_codigos_en_pdf("manifiesto.pdf", codigos)
        
        # Guardar documento con anotaciones
        with open("manifiesto_resaltado.pdf", "wb") as f:
            f.write(resultado.pdf_bytes)
        
        # Guardar reporte separado
        reporte_bytes = generar_reporte_separado(resultado, "Manifiesto DIAN")
        with open("reporte_codigos.pdf", "wb") as f:
            f.write(reporte_bytes)
    """
    highlighter = PDFHighlighter()
    return highlighter.generar_reporte_pdf(resultado, nombre_documento)

"""
Servicio de OCR usando EasyOCR para reconocimiento de texto de alta precisión.

EasyOCR es un motor de OCR basado en deep learning que:
- Soporta 80+ idiomas
- Proporciona coordenadas precisas de bounding boxes
- Tiene mejor precisión que Tesseract para documentos escaneados
- Especialmente bueno con códigos alfanuméricos

USO:
    from app.services.easyocr_service import EasyOCRService
    
    service = EasyOCRService()
    results = service.extract_text_from_page(pdf_page)
    
    for word in results:
        print(f"Texto: {word['text']}, Posición: {word['bbox']}")
"""

import io
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import hashlib

import fitz  # PyMuPDF
from loguru import logger
from PIL import Image

# Intentar importar EasyOCR
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    logger.warning("EasyOCR no disponible. Instalar con: pip install easyocr")


@dataclass
class OCRWord:
    """Palabra detectada por OCR con su posición."""
    text: str
    x: float
    y: float
    width: float
    height: float
    confidence: float
    bbox: Tuple[float, float, float, float]  # (x0, y0, x1, y1)


@dataclass 
class OCRPageResult:
    """Resultado de OCR para una página."""
    page_number: int
    words: List[OCRWord]
    full_text: str
    processing_time_ms: float


class EasyOCRService:
    """
    Servicio de OCR basado en EasyOCR para extracción de texto precisa.
    
    Características:
    - Alta precisión en códigos alfanuméricos
    - Coordenadas exactas de bounding boxes
    - Soporte para español e inglés
    - Caché de resultados por página
    """
    
    _instance = None
    _reader = None
    
    def __new__(cls):
        """Singleton para evitar cargar el modelo múltiples veces."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, languages: List[str] = None, gpu: bool = False):
        """
        Inicializa el servicio EasyOCR.
        
        Args:
            languages: Lista de idiomas (default: ['es', 'en'])
            gpu: Usar GPU para inferencia (default: False para compatibilidad)
        """
        if not EASYOCR_AVAILABLE:
            logger.error("EasyOCR no está instalado")
            return
            
        # Solo inicializar si no existe el reader
        if EasyOCRService._reader is None:
            self.languages = languages or ['es', 'en']
            self.gpu = gpu
            self._cache: Dict[str, OCRPageResult] = {}
            
            logger.info(f"Inicializando EasyOCR con idiomas: {self.languages}, GPU: {self.gpu}")
            try:
                EasyOCRService._reader = easyocr.Reader(
                    self.languages,
                    gpu=self.gpu,
                    verbose=False
                )
                logger.info("EasyOCR inicializado correctamente")
            except Exception as e:
                logger.error(f"Error inicializando EasyOCR: {e}")
                EasyOCRService._reader = None
    
    @property
    def reader(self):
        return EasyOCRService._reader
    
    @property
    def is_available(self) -> bool:
        """Verifica si el servicio está disponible."""
        return EASYOCR_AVAILABLE and self.reader is not None
    
    def extract_from_image(
        self, 
        image: Image.Image,
        detail: int = 1
    ) -> List[OCRWord]:
        """
        Extrae texto de una imagen PIL.
        
        Args:
            image: Imagen PIL
            detail: Nivel de detalle (0=solo texto, 1=con coordenadas)
            
        Returns:
            Lista de palabras detectadas con coordenadas
        """
        if not self.is_available:
            logger.error("EasyOCR no disponible")
            return []
        
        import time
        start = time.time()
        
        try:
            # Convertir imagen a bytes para EasyOCR
            img_bytes = io.BytesIO()
            image.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            # Ejecutar OCR
            results = self.reader.readtext(
                img_bytes.getvalue(),
                detail=detail,
                paragraph=False  # No agrupar en párrafos, queremos palabras individuales
            )
            
            words = []
            for result in results:
                if detail == 1:
                    bbox, text, confidence = result
                    # bbox es [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
                    x0 = min(p[0] for p in bbox)
                    y0 = min(p[1] for p in bbox)
                    x1 = max(p[0] for p in bbox)
                    y1 = max(p[1] for p in bbox)
                    
                    words.append(OCRWord(
                        text=text,
                        x=x0,
                        y=y0,
                        width=x1 - x0,
                        height=y1 - y0,
                        confidence=confidence,
                        bbox=(x0, y0, x1, y1)
                    ))
                else:
                    # detail=0, solo texto
                    words.append(OCRWord(
                        text=result,
                        x=0, y=0, width=0, height=0,
                        confidence=1.0,
                        bbox=(0, 0, 0, 0)
                    ))
            
            elapsed = (time.time() - start) * 1000
            logger.debug(f"EasyOCR extrajo {len(words)} palabras en {elapsed:.0f}ms")
            return words
            
        except Exception as e:
            logger.error(f"Error en EasyOCR: {e}")
            return []
    
    def extract_from_pdf_page(
        self,
        page: fitz.Page,
        dpi: int = 200
    ) -> OCRPageResult:
        """
        Extrae texto de una página de PDF.
        
        Args:
            page: Página de PyMuPDF
            dpi: Resolución para renderizar (default: 200)
            
        Returns:
            OCRPageResult con palabras y coordenadas
        """
        import time
        start = time.time()
        
        # Calcular factor de zoom para el DPI deseado
        zoom = dpi / 72  # 72 es el DPI base de PDF
        mat = fitz.Matrix(zoom, zoom)
        
        # Renderizar página a imagen
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes('png')
        img = Image.open(io.BytesIO(img_data))
        
        # Extraer texto
        words = self.extract_from_image(img)
        
        # Ajustar coordenadas al sistema de coordenadas del PDF
        # Las coordenadas de EasyOCR están en pixels de la imagen
        # Hay que convertirlas al sistema de coordenadas del PDF
        adjusted_words = []
        for word in words:
            # Dividir por zoom para obtener coordenadas PDF
            adjusted_words.append(OCRWord(
                text=word.text,
                x=word.x / zoom,
                y=word.y / zoom,
                width=word.width / zoom,
                height=word.height / zoom,
                confidence=word.confidence,
                bbox=(
                    word.bbox[0] / zoom,
                    word.bbox[1] / zoom,
                    word.bbox[2] / zoom,
                    word.bbox[3] / zoom
                )
            ))
        
        # Construir texto completo
        full_text = ' '.join(w.text for w in adjusted_words)
        
        elapsed = (time.time() - start) * 1000
        
        return OCRPageResult(
            page_number=page.number + 1,
            words=adjusted_words,
            full_text=full_text,
            processing_time_ms=elapsed
        )
    
    def find_code_in_page(
        self,
        page: fitz.Page,
        code: str,
        tolerance: float = 0.5
    ) -> Optional[Tuple[fitz.Rect, str, float]]:
        """
        Busca un código específico en una página y devuelve su posición exacta.
        
        Esta es la función principal para encontrar códigos como PJG777, SM-055, etc.
        
        Args:
            page: Página de PyMuPDF
            code: Código a buscar (ej: "PJG777", "SM-055")
            tolerance: Tolerancia para matching difuso (0-1)
            
        Returns:
            Tupla (rect, texto_encontrado, confianza) o None si no se encuentra
        """
        # Primero intentar búsqueda nativa de PyMuPDF (más rápido)
        code_clean = code.upper().replace('-', '').replace(' ', '')
        
        # Variaciones a buscar
        variations = [
            code,
            code.upper(),
            code_clean,
            code.replace('-', ' '),
            code.replace('-', ''),
        ]
        
        for var in variations:
            rects = page.search_for(var, quads=False)
            if rects:
                return (rects[0], var, 1.0)
        
        # Si no encuentra, usar EasyOCR para búsqueda más precisa
        if not self.is_available:
            return None
        
        ocr_result = self.extract_from_pdf_page(page)
        
        # Buscar en las palabras detectadas
        for word in ocr_result.words:
            word_clean = word.text.upper().replace('-', '').replace(' ', '')
            
            # Coincidencia exacta
            if word_clean == code_clean:
                rect = fitz.Rect(word.bbox)
                return (rect, word.text, word.confidence)
            
            # Coincidencia parcial (el código está contenido)
            if code_clean in word_clean or word_clean in code_clean:
                if len(word_clean) >= len(code_clean) * 0.8:  # Al menos 80% de longitud
                    rect = fitz.Rect(word.bbox)
                    return (rect, word.text, word.confidence * 0.9)
            
            # Matching difuso por similitud de caracteres
            if self._fuzzy_match(code_clean, word_clean, tolerance):
                rect = fitz.Rect(word.bbox)
                return (rect, word.text, word.confidence * 0.8)
        
        return None
    
    def _fuzzy_match(self, code1: str, code2: str, tolerance: float = 0.5) -> bool:
        """
        Compara dos códigos con tolerancia a errores de OCR.
        
        Args:
            code1: Código buscado
            code2: Código encontrado
            tolerance: Proporción máxima de caracteres diferentes permitidos
            
        Returns:
            True si son suficientemente similares
        """
        if len(code1) != len(code2):
            return False
        
        # Contar caracteres diferentes
        differences = sum(1 for c1, c2 in zip(code1, code2) if c1 != c2)
        max_diff = int(len(code1) * tolerance)
        
        if differences > max_diff:
            return False
        
        # Verificar que las diferencias son por confusiones típicas de OCR
        ocr_confusions = {
            'P': set('FR+D'),
            'J': set('IL1T3'),
            'G': set('6COB0Q'),
            'S': set('53'),
            'B': set('8R6'),
            'O': set('0QD8'),
            'I': set('1LJT'),
            '0': set('OQ'),
            '1': set('IL'),
            '8': set('BO0'),
            '6': set('GB'),
            '3': set('SJ'),
        }
        
        for c1, c2 in zip(code1, code2):
            if c1 == c2:
                continue
            # Verificar si la diferencia es una confusión típica
            confusions = ocr_confusions.get(c1, set())
            if c2 not in confusions:
                # También verificar en dirección inversa
                confusions_rev = ocr_confusions.get(c2, set())
                if c1 not in confusions_rev:
                    return False
        
        return True
    
    def find_all_codes_in_pdf(
        self,
        pdf_bytes: bytes,
        codes: List[str]
    ) -> Dict[str, List[Tuple[int, fitz.Rect, float]]]:
        """
        Busca múltiples códigos en todo el PDF.
        
        Args:
            pdf_bytes: Bytes del PDF
            codes: Lista de códigos a buscar
            
        Returns:
            Diccionario {codigo: [(pagina, rect, confianza), ...]}
        """
        results = {code: [] for code in codes}
        
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            for code in codes:
                found = self.find_code_in_page(page, code)
                if found:
                    rect, text, confidence = found
                    results[code].append((page_num + 1, rect, confidence))
                    logger.info(f"EasyOCR encontró '{code}' como '{text}' en página {page_num + 1} (conf: {confidence:.2f})")
        
        doc.close()
        return results


# Singleton global
_easyocr_service: Optional[EasyOCRService] = None


def get_easyocr_service() -> EasyOCRService:
    """Obtiene la instancia singleton del servicio EasyOCR."""
    global _easyocr_service
    if _easyocr_service is None:
        _easyocr_service = EasyOCRService()
    return _easyocr_service


def is_easyocr_available() -> bool:
    """Verifica si EasyOCR está disponible."""
    return EASYOCR_AVAILABLE

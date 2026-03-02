"""
Módulo OCR para extracción de texto de imágenes y PDFs escaneados.
Fase 3.2 - OCR usando Tesseract.
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import BinaryIO, Dict, List, Optional, Tuple, Union

import fitz  # PyMuPDF
from loguru import logger
from PIL import Image, ImageEnhance, ImageFilter

try:
    import pytesseract
    TESSERACT_DISPONIBLE = True
except ImportError:
    TESSERACT_DISPONIBLE = False
    logger.warning("pytesseract no está instalado")


class IdiomaOCR(str, Enum):
    """Idiomas soportados para OCR."""
    
    ESPAÑOL = "spa"
    INGLES = "eng"
    ESPAÑOL_INGLES = "spa+eng"
    INGLES_ESPAÑOL = "eng+spa"


class CalidadImagen(str, Enum):
    """Niveles de calidad/resolución para conversión PDF a imagen."""
    
    BAJA = "low"      # 72 DPI - Rápido pero baja calidad
    MEDIA = "medium"  # 150 DPI - Balance entre velocidad y calidad
    ALTA = "high"     # 300 DPI - Alta calidad, más lento
    MUY_ALTA = "very_high"  # 400 DPI - Máxima calidad para PDFs difíciles


# Mapeo de calidad a DPI
CALIDAD_A_DPI: Dict[CalidadImagen, int] = {
    CalidadImagen.BAJA: 72,
    CalidadImagen.MEDIA: 150,
    CalidadImagen.ALTA: 300,
    CalidadImagen.MUY_ALTA: 400,
}


@dataclass
class ConfiguracionOCR:
    """Configuración para el procesamiento OCR."""
    
    idioma: IdiomaOCR = IdiomaOCR.ESPAÑOL_INGLES
    calidad: CalidadImagen = CalidadImagen.ALTA
    optimizar_imagen: bool = True
    aumentar_contraste: bool = True
    factor_contraste: float = 1.5
    aplicar_nitidez: bool = True
    binarizar: bool = False  # Convertir a blanco y negro
    umbral_binarizacion: int = 128
    # Configuración de Tesseract
    psm: int = 3  # Page Segmentation Mode (3 = auto)
    oem: int = 3  # OCR Engine Mode (3 = default, LSTM + Legacy)


@dataclass
class ResultadoPaginaOCR:
    """Resultado de OCR para una página."""
    
    numero_pagina: int
    texto: str
    confianza: float  # 0-100
    tiempo_proceso_ms: int
    ancho: int
    alto: int
    dpi_usado: int
    exito: bool
    error: Optional[str] = None


@dataclass
class ResultadoOCR:
    """Resultado completo del procesamiento OCR."""
    
    exito: bool
    texto_completo: str
    paginas: List[ResultadoPaginaOCR] = field(default_factory=list)
    total_paginas: int = 0
    tiempo_total_ms: int = 0
    idioma_usado: str = ""
    dpi_usado: int = 0
    mensaje: str = ""
    error: Optional[str] = None


class OCRExtractor:
    """
    Extractor de texto usando OCR (Tesseract).
    
    Características:
    - Conversión de PDF a imágenes de alta calidad
    - Preprocesamiento de imágenes para mejorar OCR
    - Soporte para múltiples idiomas
    - Configuración flexible de calidad
    """
    
    def __init__(self, config: Optional[ConfiguracionOCR] = None):
        """
        Inicializar el extractor OCR.
        
        Args:
            config: Configuración OCR (usa valores por defecto si no se especifica)
        """
        self.config = config or ConfiguracionOCR()
        self._verificar_tesseract()
        logger.info(f"OCRExtractor inicializado (idioma: {self.config.idioma.value})")
    
    def _verificar_tesseract(self) -> None:
        """Verifica que Tesseract esté instalado y disponible."""
        if not TESSERACT_DISPONIBLE:
            raise RuntimeError(
                "pytesseract no está instalado. "
                "Ejecuta: pip install pytesseract"
            )
        
        try:
            version = pytesseract.get_tesseract_version()
            logger.debug(f"Tesseract versión: {version}")
        except Exception as e:
            raise RuntimeError(
                f"Tesseract OCR no está instalado o no se encuentra en PATH: {e}. "
                "En Fedora: sudo dnf install tesseract tesseract-langpack-spa"
            )
    
    def obtener_idiomas_disponibles(self) -> List[str]:
        """Obtiene la lista de idiomas instalados en Tesseract."""
        try:
            return pytesseract.get_languages()
        except Exception as e:
            logger.error(f"Error obteniendo idiomas: {e}")
            return []
    
    def extraer_de_pdf(
        self,
        source: Union[str, Path, BinaryIO, bytes],
        config: Optional[ConfiguracionOCR] = None,
    ) -> ResultadoOCR:
        """
        Extrae texto de un PDF usando OCR.
        
        Args:
            source: Ruta al PDF, bytes o archivo binario
            config: Configuración específica (usa la del constructor si no se especifica)
            
        Returns:
            ResultadoOCR con el texto extraído
        """
        import time
        inicio = time.time()
        
        cfg = config or self.config
        dpi = CALIDAD_A_DPI[cfg.calidad]
        
        try:
            # Abrir el documento PDF
            doc = self._abrir_pdf(source)
            total_paginas = len(doc)
            
            paginas_resultado: List[ResultadoPaginaOCR] = []
            textos: List[str] = []
            
            for num_pagina in range(total_paginas):
                inicio_pagina = time.time()
                
                try:
                    # Convertir página a imagen
                    imagen = self._pdf_pagina_a_imagen(doc, num_pagina, dpi)
                    
                    # Optimizar imagen si está configurado
                    if cfg.optimizar_imagen:
                        imagen = self._optimizar_imagen(imagen, cfg)
                    
                    # Extraer texto con OCR
                    texto, confianza = self._extraer_texto_imagen(imagen, cfg)
                    
                    tiempo_pagina = int((time.time() - inicio_pagina) * 1000)
                    
                    resultado_pagina = ResultadoPaginaOCR(
                        numero_pagina=num_pagina + 1,
                        texto=texto,
                        confianza=confianza,
                        tiempo_proceso_ms=tiempo_pagina,
                        ancho=imagen.width,
                        alto=imagen.height,
                        dpi_usado=dpi,
                        exito=True,
                    )
                    
                    paginas_resultado.append(resultado_pagina)
                    textos.append(texto)
                    
                    logger.debug(
                        f"Página {num_pagina + 1}/{total_paginas}: "
                        f"{len(texto)} caracteres, confianza {confianza:.1f}%"
                    )
                    
                except Exception as e:
                    logger.error(f"Error en página {num_pagina + 1}: {e}")
                    tiempo_pagina = int((time.time() - inicio_pagina) * 1000)
                    
                    paginas_resultado.append(ResultadoPaginaOCR(
                        numero_pagina=num_pagina + 1,
                        texto="",
                        confianza=0.0,
                        tiempo_proceso_ms=tiempo_pagina,
                        ancho=0,
                        alto=0,
                        dpi_usado=dpi,
                        exito=False,
                        error=str(e),
                    ))
            
            doc.close()
            
            tiempo_total = int((time.time() - inicio) * 1000)
            
            return ResultadoOCR(
                exito=True,
                texto_completo="\n\n".join(textos),
                paginas=paginas_resultado,
                total_paginas=total_paginas,
                tiempo_total_ms=tiempo_total,
                idioma_usado=cfg.idioma.value,
                dpi_usado=dpi,
                mensaje=f"OCR completado: {total_paginas} páginas en {tiempo_total}ms",
            )
            
        except Exception as e:
            logger.exception(f"Error en OCR de PDF: {e}")
            tiempo_total = int((time.time() - inicio) * 1000)
            
            return ResultadoOCR(
                exito=False,
                texto_completo="",
                tiempo_total_ms=tiempo_total,
                idioma_usado=cfg.idioma.value,
                dpi_usado=dpi,
                error=str(e),
                mensaje=f"Error durante OCR: {e}",
            )
    
    def extraer_de_imagen(
        self,
        source: Union[str, Path, Image.Image, bytes],
        config: Optional[ConfiguracionOCR] = None,
    ) -> Tuple[str, float]:
        """
        Extrae texto de una imagen usando OCR.
        
        Args:
            source: Ruta a imagen, objeto PIL Image o bytes
            config: Configuración específica
            
        Returns:
            Tupla (texto extraído, confianza 0-100)
        """
        cfg = config or self.config
        
        # Cargar imagen
        if isinstance(source, Image.Image):
            imagen = source
        elif isinstance(source, bytes):
            from io import BytesIO
            imagen = Image.open(BytesIO(source))
        else:
            imagen = Image.open(source)
        
        # Optimizar si está configurado
        if cfg.optimizar_imagen:
            imagen = self._optimizar_imagen(imagen, cfg)
        
        return self._extraer_texto_imagen(imagen, cfg)
    
    def _abrir_pdf(
        self,
        source: Union[str, Path, BinaryIO, bytes],
    ) -> fitz.Document:
        """Abre un documento PDF desde diferentes fuentes."""
        if isinstance(source, bytes):
            return fitz.open(stream=source, filetype="pdf")
        elif isinstance(source, (str, Path)):
            return fitz.open(str(source))
        else:
            content = source.read()
            return fitz.open(stream=content, filetype="pdf")
    
    def _pdf_pagina_a_imagen(
        self,
        doc: fitz.Document,
        num_pagina: int,
        dpi: int,
    ) -> Image.Image:
        """
        Convierte una página de PDF a imagen PIL.
        
        Args:
            doc: Documento PDF abierto
            num_pagina: Índice de página (0-based)
            dpi: Resolución deseada
            
        Returns:
            Imagen PIL de la página
        """
        page = doc[num_pagina]
        
        # Calcular matriz de transformación para el DPI deseado
        # PyMuPDF usa 72 DPI por defecto
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        
        # Renderizar página a pixmap
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Convertir a imagen PIL
        imagen = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        return imagen
    
    def _optimizar_imagen(
        self,
        imagen: Image.Image,
        config: ConfiguracionOCR,
    ) -> Image.Image:
        """
        Aplica optimizaciones a la imagen para mejorar el OCR.
        
        Args:
            imagen: Imagen original
            config: Configuración de optimización
            
        Returns:
            Imagen optimizada
        """
        # Convertir a escala de grises para mejor OCR
        if imagen.mode != "L":
            imagen = imagen.convert("L")
        
        # Aumentar contraste
        if config.aumentar_contraste:
            enhancer = ImageEnhance.Contrast(imagen)
            imagen = enhancer.enhance(config.factor_contraste)
        
        # Aplicar nitidez
        if config.aplicar_nitidez:
            imagen = imagen.filter(ImageFilter.SHARPEN)
        
        # Binarización (blanco y negro puro)
        if config.binarizar:
            imagen = imagen.point(
                lambda x: 255 if x > config.umbral_binarizacion else 0,
                mode="1"
            )
        
        return imagen
    
    def _extraer_texto_imagen(
        self,
        imagen: Image.Image,
        config: ConfiguracionOCR,
    ) -> Tuple[str, float]:
        """
        Extrae texto de una imagen usando Tesseract.
        
        Args:
            imagen: Imagen PIL
            config: Configuración OCR
            
        Returns:
            Tupla (texto extraído, confianza promedio 0-100)
        """
        # Configurar opciones de Tesseract
        custom_config = f"--psm {config.psm} --oem {config.oem}"
        
        # Extraer texto con datos de confianza
        try:
            data = pytesseract.image_to_data(
                imagen,
                lang=config.idioma.value,
                config=custom_config,
                output_type=pytesseract.Output.DICT,
            )
            
            # Calcular confianza promedio (excluyendo valores -1)
            confidencias = [
                int(c) for c in data["conf"] 
                if c != "-1" and int(c) >= 0
            ]
            confianza_promedio = (
                sum(confidencias) / len(confidencias) 
                if confidencias else 0.0
            )
            
            # Extraer texto limpio
            texto = pytesseract.image_to_string(
                imagen,
                lang=config.idioma.value,
                config=custom_config,
            ).strip()
            
            return texto, confianza_promedio
            
        except Exception as e:
            logger.error(f"Error en Tesseract: {e}")
            # Intentar extracción simple sin datos de confianza
            try:
                texto = pytesseract.image_to_string(
                    imagen,
                    lang=config.idioma.value,
                    config=custom_config,
                ).strip()
                return texto, 0.0
            except Exception:
                raise
    
    def extraer_pagina_especifica(
        self,
        source: Union[str, Path, BinaryIO, bytes],
        num_pagina: int,
        config: Optional[ConfiguracionOCR] = None,
    ) -> ResultadoPaginaOCR:
        """
        Extrae texto de una página específica del PDF usando OCR.
        
        Args:
            source: Fuente del PDF
            num_pagina: Número de página (1-based)
            config: Configuración específica
            
        Returns:
            ResultadoPaginaOCR con el texto extraído
        """
        import time
        inicio = time.time()
        
        cfg = config or self.config
        dpi = CALIDAD_A_DPI[cfg.calidad]
        
        try:
            doc = self._abrir_pdf(source)
            
            if num_pagina < 1 or num_pagina > len(doc):
                doc.close()
                return ResultadoPaginaOCR(
                    numero_pagina=num_pagina,
                    texto="",
                    confianza=0.0,
                    tiempo_proceso_ms=0,
                    ancho=0,
                    alto=0,
                    dpi_usado=dpi,
                    exito=False,
                    error=f"Página {num_pagina} fuera de rango (1-{len(doc)})",
                )
            
            imagen = self._pdf_pagina_a_imagen(doc, num_pagina - 1, dpi)
            
            if cfg.optimizar_imagen:
                imagen = self._optimizar_imagen(imagen, cfg)
            
            texto, confianza = self._extraer_texto_imagen(imagen, cfg)
            
            doc.close()
            
            tiempo = int((time.time() - inicio) * 1000)
            
            return ResultadoPaginaOCR(
                numero_pagina=num_pagina,
                texto=texto,
                confianza=confianza,
                tiempo_proceso_ms=tiempo,
                ancho=imagen.width,
                alto=imagen.height,
                dpi_usado=dpi,
                exito=True,
            )
            
        except Exception as e:
            tiempo = int((time.time() - inicio) * 1000)
            return ResultadoPaginaOCR(
                numero_pagina=num_pagina,
                texto="",
                confianza=0.0,
                tiempo_proceso_ms=tiempo,
                ancho=0,
                alto=0,
                dpi_usado=dpi,
                exito=False,
                error=str(e),
            )


# Función de conveniencia para crear extractor con configuración predeterminada
def crear_ocr_extractor(
    idioma: IdiomaOCR = IdiomaOCR.ESPAÑOL_INGLES,
    calidad: CalidadImagen = CalidadImagen.ALTA,
) -> OCRExtractor:
    """
    Crea un extractor OCR con configuración personalizada.
    
    Args:
        idioma: Idioma(s) para OCR
        calidad: Calidad de conversión PDF a imagen
        
    Returns:
        OCRExtractor configurado
    """
    config = ConfiguracionOCR(idioma=idioma, calidad=calidad)
    return OCRExtractor(config)


# Instancia global con configuración por defecto
ocr_extractor = OCRExtractor()

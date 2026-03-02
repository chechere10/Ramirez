"""
Módulo de Extracción de Texto de PDFs.
Fase 3.1 - Extracción de texto usando PyMuPDF (fitz).
"""

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, List, Optional, Union

import fitz  # PyMuPDF
from loguru import logger


@dataclass
class PDFMetadata:
    """Metadatos extraídos de un PDF."""
    
    titulo: Optional[str] = None
    autor: Optional[str] = None
    asunto: Optional[str] = None
    creador: Optional[str] = None
    productor: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None
    total_paginas: int = 0
    tamaño_bytes: int = 0
    formato: str = "PDF"
    version_pdf: Optional[str] = None
    encriptado: bool = False


@dataclass
class PDFPage:
    """Información de una página del PDF."""
    
    numero: int
    texto: str
    tiene_texto: bool
    tiene_imagenes: bool
    es_escaneado: bool  # True si la página parece ser una imagen escaneada
    ancho: float
    alto: float
    cantidad_caracteres: int
    cantidad_imagenes: int


@dataclass
class PDFExtractionResult:
    """Resultado de la extracción de texto de un PDF."""
    
    exito: bool
    metadata: PDFMetadata
    paginas: List[PDFPage] = field(default_factory=list)
    texto_completo: str = ""
    es_pdf_escaneado: bool = False  # True si todo el PDF parece escaneado
    requiere_ocr: bool = False
    mensaje: str = ""
    error: Optional[str] = None


class PDFExtractor:
    """
    Extractor de texto de archivos PDF usando PyMuPDF.
    
    Características:
    - Extrae texto de PDFs nativos (con texto seleccionable)
    - Detecta si el PDF es escaneado (requiere OCR)
    - Extrae metadatos del documento
    - Maneja PDFs con múltiples páginas
    """
    
    # Umbral mínimo de caracteres por página para considerar que tiene texto
    MIN_CHARS_THRESHOLD = 50
    
    def __init__(self):
        """Inicializar el extractor."""
        logger.info("PDFExtractor inicializado")
    
    def extraer(
        self,
        source: Union[str, Path, BinaryIO, bytes],
    ) -> PDFExtractionResult:
        """
        Extrae texto y metadatos de un archivo PDF.
        
        Args:
            source: Ruta al archivo PDF, objeto de archivo o bytes
            
        Returns:
            PDFExtractionResult con el texto extraído y metadatos
        """
        try:
            # Abrir el documento
            doc = self._abrir_documento(source)
            
            # Extraer metadatos
            metadata = self._extraer_metadata(doc, source)
            
            # Extraer texto de cada página
            paginas = []
            textos = []
            paginas_escaneadas = 0
            
            for num_pagina in range(len(doc)):
                page_info = self._procesar_pagina(doc, num_pagina)
                paginas.append(page_info)
                textos.append(page_info.texto)
                
                if page_info.es_escaneado:
                    paginas_escaneadas += 1
            
            # Determinar si el PDF completo es escaneado
            total_paginas = len(doc)
            es_escaneado = (
                total_paginas > 0 and 
                paginas_escaneadas >= (total_paginas * 0.8)  # 80% o más
            )
            
            # Cerrar documento
            doc.close()
            
            return PDFExtractionResult(
                exito=True,
                metadata=metadata,
                paginas=paginas,
                texto_completo="\n\n".join(textos),
                es_pdf_escaneado=es_escaneado,
                requiere_ocr=es_escaneado,
                mensaje=self._generar_mensaje_resultado(
                    total_paginas, paginas_escaneadas, es_escaneado
                ),
            )
            
        except fitz.FileDataError as e:
            logger.error(f"Error de formato PDF: {e}")
            return PDFExtractionResult(
                exito=False,
                metadata=PDFMetadata(),
                error=f"El archivo no es un PDF válido: {e}",
                mensaje="Error: archivo PDF inválido o corrupto",
            )
        except Exception as e:
            logger.exception(f"Error extrayendo texto del PDF: {e}")
            return PDFExtractionResult(
                exito=False,
                metadata=PDFMetadata(),
                error=str(e),
                mensaje=f"Error durante la extracción: {e}",
            )
    
    def _abrir_documento(
        self,
        source: Union[str, Path, BinaryIO, bytes],
    ) -> fitz.Document:
        """Abre un documento PDF desde diferentes fuentes."""
        if isinstance(source, bytes):
            return fitz.open(stream=source, filetype="pdf")
        elif isinstance(source, (str, Path)):
            return fitz.open(str(source))
        else:
            # BinaryIO - leer bytes
            content = source.read()
            return fitz.open(stream=content, filetype="pdf")
    
    def _extraer_metadata(
        self,
        doc: fitz.Document,
        source: Union[str, Path, BinaryIO, bytes],
    ) -> PDFMetadata:
        """Extrae metadatos del documento PDF."""
        meta = doc.metadata or {}
        
        # Obtener tamaño del archivo
        tamaño = 0
        if isinstance(source, (str, Path)):
            try:
                tamaño = Path(source).stat().st_size
            except Exception:
                pass
        elif isinstance(source, bytes):
            tamaño = len(source)
        
        # Parsear fechas si existen
        fecha_creacion = self._parsear_fecha_pdf(meta.get("creationDate"))
        fecha_modificacion = self._parsear_fecha_pdf(meta.get("modDate"))
        
        return PDFMetadata(
            titulo=meta.get("title") or None,
            autor=meta.get("author") or None,
            asunto=meta.get("subject") or None,
            creador=meta.get("creator") or None,
            productor=meta.get("producer") or None,
            fecha_creacion=fecha_creacion,
            fecha_modificacion=fecha_modificacion,
            total_paginas=len(doc),
            tamaño_bytes=tamaño,
            formato="PDF",
            version_pdf=f"PDF {doc.metadata.get('format', 'unknown')}",
            encriptado=doc.is_encrypted,
        )
    
    def _parsear_fecha_pdf(self, date_str: Optional[str]) -> Optional[datetime]:
        """
        Parsea una fecha en formato PDF (D:YYYYMMDDHHmmSS).
        
        Args:
            date_str: String de fecha en formato PDF
            
        Returns:
            datetime o None si no se puede parsear
        """
        if not date_str:
            return None
        
        try:
            # Formato típico: D:20260120153045+00'00'
            if date_str.startswith("D:"):
                date_str = date_str[2:]
            
            # Tomar solo los primeros 14 caracteres (YYYYMMDDHHmmSS)
            date_str = date_str[:14]
            
            return datetime.strptime(date_str, "%Y%m%d%H%M%S")
        except Exception:
            return None
    
    def _procesar_pagina(
        self,
        doc: fitz.Document,
        num_pagina: int,
    ) -> PDFPage:
        """
        Procesa una página individual del PDF.
        
        Args:
            doc: Documento PDF abierto
            num_pagina: Índice de la página (0-based)
            
        Returns:
            PDFPage con información de la página
        """
        page = doc[num_pagina]
        
        # Extraer texto
        texto = page.get_text("text").strip()
        cantidad_chars = len(texto)
        
        # Contar imágenes en la página
        imagenes = page.get_images(full=True)
        cantidad_imagenes = len(imagenes)
        
        # Determinar si la página tiene texto real
        tiene_texto = cantidad_chars >= self.MIN_CHARS_THRESHOLD
        tiene_imagenes = cantidad_imagenes > 0
        
        # Determinar si es una página escaneada
        # (tiene imágenes pero poco o nada de texto)
        es_escaneado = (
            tiene_imagenes and 
            not tiene_texto and
            cantidad_imagenes <= 2  # Típicamente 1 imagen por página escaneada
        )
        
        # Obtener dimensiones
        rect = page.rect
        
        return PDFPage(
            numero=num_pagina + 1,  # 1-based para el usuario
            texto=texto,
            tiene_texto=tiene_texto,
            tiene_imagenes=tiene_imagenes,
            es_escaneado=es_escaneado,
            ancho=rect.width,
            alto=rect.height,
            cantidad_caracteres=cantidad_chars,
            cantidad_imagenes=cantidad_imagenes,
        )
    
    def _generar_mensaje_resultado(
        self,
        total_paginas: int,
        paginas_escaneadas: int,
        es_escaneado: bool,
    ) -> str:
        """Genera un mensaje descriptivo del resultado."""
        if es_escaneado:
            return (
                f"PDF escaneado detectado ({paginas_escaneadas}/{total_paginas} páginas). "
                "Se requiere OCR para extraer el texto."
            )
        elif paginas_escaneadas > 0:
            return (
                f"PDF mixto: {total_paginas - paginas_escaneadas} páginas con texto, "
                f"{paginas_escaneadas} páginas escaneadas que requieren OCR."
            )
        else:
            return f"Texto extraído exitosamente de {total_paginas} páginas."
    
    def obtener_texto_pagina(
        self,
        source: Union[str, Path, BinaryIO, bytes],
        num_pagina: int,
    ) -> Optional[str]:
        """
        Obtiene el texto de una página específica.
        
        Args:
            source: Fuente del PDF
            num_pagina: Número de página (1-based)
            
        Returns:
            Texto de la página o None si hay error
        """
        try:
            doc = self._abrir_documento(source)
            
            if num_pagina < 1 or num_pagina > len(doc):
                doc.close()
                return None
            
            page = doc[num_pagina - 1]
            texto = page.get_text("text").strip()
            doc.close()
            
            return texto
            
        except Exception as e:
            logger.error(f"Error obteniendo texto de página {num_pagina}: {e}")
            return None
    
    def es_pdf_valido(
        self,
        source: Union[str, Path, BinaryIO, bytes],
    ) -> bool:
        """
        Verifica si un archivo es un PDF válido.
        
        Args:
            source: Fuente del PDF
            
        Returns:
            True si es un PDF válido
        """
        try:
            doc = self._abrir_documento(source)
            es_valido = doc.page_count > 0
            doc.close()
            return es_valido
        except Exception:
            return False


# Instancia global del extractor
pdf_extractor = PDFExtractor()

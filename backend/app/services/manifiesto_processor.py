"""
Servicio de Procesamiento de Manifiestos.
Fase 3.4 - Orquesta la carga, extracción, almacenamiento e indexación.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, BinaryIO, Dict, List, Optional, Union

from loguru import logger
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.codigo import Codigo
from app.models.documento import Documento
from app.schemas.documento import EstadoDocumento, TipoDocumento
from app.services.code_extractor import (
    CodigoExtraido,
    ExtractorCodigos,
    ResultadoExtraccionCodigos,
    TipoCodigo,
)
from app.services.indexacion_service import (
    IndexacionService,
    get_indexacion_service,
)
from app.services.ocr_extractor import (
    CalidadImagen,
    ConfiguracionOCR,
    IdiomaOCR,
    OCRExtractor,
)
from app.services.pdf_extractor import PDFExtractionResult, PDFExtractor, PDFPage


class EstadoProcesamiento(str, Enum):
    """Estados del procesamiento de un manifiesto."""
    
    PENDIENTE = "pendiente"
    CARGANDO = "cargando"
    EXTRAYENDO_TEXTO = "extrayendo_texto"
    APLICANDO_OCR = "aplicando_ocr"
    EXTRAYENDO_CODIGOS = "extrayendo_codigos"
    ALMACENANDO = "almacenando"
    INDEXANDO = "indexando"
    COMPLETADO = "completado"
    ERROR = "error"


@dataclass
class ResumenProcesamiento:
    """Resumen del resultado del procesamiento de un manifiesto."""
    
    documento_id: Optional[int] = None
    nombre_archivo: str = ""
    tipo: TipoDocumento = TipoDocumento.MANIFIESTO
    estado: EstadoProcesamiento = EstadoProcesamiento.PENDIENTE
    
    # Métricas del documento
    total_paginas: int = 0
    tamaño_bytes: int = 0
    
    # Métricas de extracción
    texto_extraido: bool = False
    ocr_aplicado: bool = False
    caracteres_extraidos: int = 0
    
    # Métricas de códigos
    total_codigos: int = 0
    codigos_unicos: int = 0
    codigos_duplicados: int = 0
    codigos_por_tipo: Dict[str, int] = field(default_factory=dict)
    codigos_por_pagina: Dict[int, int] = field(default_factory=dict)
    
    # Indexación
    indexado_elasticsearch: bool = False
    
    # Tiempos
    tiempo_total_ms: int = 0
    tiempo_extraccion_ms: int = 0
    tiempo_ocr_ms: int = 0
    tiempo_codigos_ms: int = 0
    tiempo_almacenamiento_ms: int = 0
    tiempo_indexacion_ms: int = 0
    
    # Errores
    errores: List[str] = field(default_factory=list)
    advertencias: List[str] = field(default_factory=list)
    
    # Fechas
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    
    @property
    def exito(self) -> bool:
        """Indica si el procesamiento fue exitoso."""
        return self.estado == EstadoProcesamiento.COMPLETADO and not self.errores
    
    def to_dict(self) -> dict:
        """Convierte el resumen a diccionario."""
        return {
            "documento_id": self.documento_id,
            "nombre_archivo": self.nombre_archivo,
            "tipo": self.tipo.value,
            "estado": self.estado.value,
            "exito": self.exito,
            "metricas": {
                "total_paginas": self.total_paginas,
                "tamaño_bytes": self.tamaño_bytes,
                "caracteres_extraidos": self.caracteres_extraidos,
                "texto_extraido": self.texto_extraido,
                "ocr_aplicado": self.ocr_aplicado,
            },
            "codigos": {
                "total": self.total_codigos,
                "unicos": self.codigos_unicos,
                "duplicados": self.codigos_duplicados,
                "por_tipo": self.codigos_por_tipo,
                "por_pagina": self.codigos_por_pagina,
            },
            "indexacion": {
                "elasticsearch": self.indexado_elasticsearch,
            },
            "tiempos_ms": {
                "total": self.tiempo_total_ms,
                "extraccion": self.tiempo_extraccion_ms,
                "ocr": self.tiempo_ocr_ms,
                "codigos": self.tiempo_codigos_ms,
                "almacenamiento": self.tiempo_almacenamiento_ms,
                "indexacion": self.tiempo_indexacion_ms,
            },
            "errores": self.errores,
            "advertencias": self.advertencias,
            "fecha_inicio": self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            "fecha_fin": self.fecha_fin.isoformat() if self.fecha_fin else None,
        }


class ManifiestoProcessor:
    """
    Procesador de manifiestos.
    
    Orquesta todo el flujo:
    1. Carga del archivo PDF
    2. Extracción de texto (directo o OCR)
    3. Extracción de códigos
    4. Almacenamiento en base de datos
    5. Indexación en ElasticSearch
    """
    
    def __init__(
        self,
        db: Optional[Session] = None,
        indexacion_service: Optional[IndexacionService] = None,
        usar_ocr_si_necesario: bool = True,
        calidad_ocr: CalidadImagen = CalidadImagen.ALTA,
        idioma_ocr: IdiomaOCR = IdiomaOCR.ESPAÑOL_INGLES,
    ):
        """
        Inicializa el procesador de manifiestos.
        
        Args:
            db: Sesión de SQLAlchemy (opcional)
            indexacion_service: Servicio de indexación (opcional, usa global)
            usar_ocr_si_necesario: Aplicar OCR a páginas escaneadas
            calidad_ocr: Calidad de imagen para OCR
            idioma_ocr: Idioma(s) para OCR
        """
        self.db = db
        self.indexacion_service = indexacion_service or get_indexacion_service()
        self.usar_ocr = usar_ocr_si_necesario
        
        # Inicializar extractores
        self.pdf_extractor = PDFExtractor()
        self.code_extractor = ExtractorCodigos()
        
        # Configurar OCR
        self.ocr_config = ConfiguracionOCR(
            idioma=idioma_ocr,
            calidad=calidad_ocr,
            optimizar_imagen=True,
        )
        self.ocr_extractor = OCRExtractor(self.ocr_config)
        
        logger.info("ManifiestoProcessor inicializado")
    
    def procesar(
        self,
        source: Union[str, Path, BinaryIO, bytes],
        nombre_archivo: str,
        usuario_id: Optional[int] = None,
        descripcion: Optional[str] = None,
        tipos_codigo: Optional[List[TipoCodigo]] = None,
    ) -> ResumenProcesamiento:
        """
        Procesa un manifiesto completo.
        
        Args:
            source: Fuente del PDF (ruta, bytes o archivo)
            nombre_archivo: Nombre original del archivo
            usuario_id: ID del usuario que carga (opcional)
            descripcion: Descripción del documento
            tipos_codigo: Tipos de código a extraer (None = todos)
            
        Returns:
            ResumenProcesamiento con todos los detalles
        """
        import time
        inicio_total = time.time()
        
        resumen = ResumenProcesamiento(
            nombre_archivo=nombre_archivo,
            tipo=TipoDocumento.MANIFIESTO,
            fecha_inicio=datetime.now(),
        )
        
        try:
            resumen.estado = EstadoProcesamiento.CARGANDO
            logger.info(f"Iniciando procesamiento de: {nombre_archivo}")
            
            # Obtener bytes del archivo
            contenido = self._obtener_contenido(source)
            resumen.tamaño_bytes = len(contenido)
            
            # 1. Extraer texto del PDF
            resumen.estado = EstadoProcesamiento.EXTRAYENDO_TEXTO
            inicio = time.time()
            
            resultado_pdf = self.pdf_extractor.extraer(contenido)
            
            if not resultado_pdf.exito:
                raise ValueError(f"Error extrayendo PDF: {resultado_pdf.error}")
            
            resumen.total_paginas = resultado_pdf.metadata.total_paginas
            resumen.tiempo_extraccion_ms = int((time.time() - inicio) * 1000)
            
            # 2. Construir texto por página (con OCR si es necesario)
            textos_paginas: Dict[int, str] = {}
            
            for pagina in resultado_pdf.paginas:
                if pagina.tiene_texto:
                    textos_paginas[pagina.numero] = pagina.texto
                    resumen.texto_extraido = True
                elif self.usar_ocr and pagina.es_escaneado:
                    # Aplicar OCR a esta página
                    resumen.estado = EstadoProcesamiento.APLICANDO_OCR
                    inicio_ocr = time.time()
                    
                    resultado_ocr = self.ocr_extractor.extraer_pagina_especifica(
                        contenido,
                        pagina.numero,
                        self.ocr_config,
                    )
                    
                    if resultado_ocr.exito and resultado_ocr.texto:
                        textos_paginas[pagina.numero] = resultado_ocr.texto
                        resumen.ocr_aplicado = True
                    else:
                        resumen.advertencias.append(
                            f"OCR falló en página {pagina.numero}"
                        )
                    
                    resumen.tiempo_ocr_ms += int((time.time() - inicio_ocr) * 1000)
            
            # Calcular total de caracteres
            resumen.caracteres_extraidos = sum(len(t) for t in textos_paginas.values())
            
            if not textos_paginas:
                raise ValueError("No se pudo extraer texto del documento")
            
            # 3. Extraer códigos
            resumen.estado = EstadoProcesamiento.EXTRAYENDO_CODIGOS
            inicio = time.time()
            
            resultado_codigos = self.code_extractor.extraer_de_paginas(
                textos_paginas,
                tipos_filtro=tipos_codigo,
            )
            
            resumen.tiempo_codigos_ms = int((time.time() - inicio) * 1000)
            resumen.total_codigos = resultado_codigos.total_encontrados
            resumen.codigos_unicos = resultado_codigos.total_unicos
            resumen.codigos_duplicados = resultado_codigos.total_duplicados
            resumen.codigos_por_tipo = {
                k.value: v for k, v in resultado_codigos.por_tipo.items()
            }
            resumen.codigos_por_pagina = resultado_codigos.por_pagina
            
            logger.info(
                f"Extraídos {resumen.total_codigos} códigos "
                f"({resumen.codigos_unicos} únicos)"
            )
            
            # 4. Almacenar en base de datos
            if self.db:
                resumen.estado = EstadoProcesamiento.ALMACENANDO
                inicio = time.time()
                
                documento = self._almacenar_en_db(
                    contenido=contenido,
                    nombre_archivo=nombre_archivo,
                    resultado_pdf=resultado_pdf,
                    resultado_codigos=resultado_codigos,
                    usuario_id=usuario_id,
                    descripcion=descripcion,
                    ocr_aplicado=resumen.ocr_aplicado,
                )
                
                resumen.documento_id = documento.id
                resumen.tiempo_almacenamiento_ms = int((time.time() - inicio) * 1000)
                
                logger.info(f"Documento almacenado con ID: {documento.id}")
            
            # 5. Indexar en ElasticSearch
            if self.indexacion_service and self.indexacion_service.disponible:
                resumen.estado = EstadoProcesamiento.INDEXANDO
                inicio = time.time()
                
                # Convertir textos_paginas a lista de PDFPage para el servicio
                paginas_para_indexar = [
                    PDFPage(
                        numero=num,
                        texto=texto,
                        tiene_texto=True,
                        tiene_imagenes=False,
                        es_escaneado=False,
                        ancho=0,
                        alto=0,
                        cantidad_caracteres=len(texto),
                        cantidad_imagenes=0,
                    )
                    for num, texto in textos_paginas.items()
                ]
                
                # Usar el servicio de indexación
                resultado_idx = self.indexacion_service.indexar_documento_completo(
                    documento_id=resumen.documento_id or 0,
                    nombre_archivo=nombre_archivo,
                    tipo_documento="manifiesto",
                    texto_completo="\n\n".join(textos_paginas.values()),
                    paginas=paginas_para_indexar,
                    codigos=resultado_codigos.codigos,
                    metadata={
                        "autor": resultado_pdf.metadata.autor,
                        "titulo": resultado_pdf.metadata.titulo,
                        "creador": resultado_pdf.metadata.creador,
                        "fecha_creacion": resultado_pdf.metadata.fecha_creacion.isoformat() 
                            if resultado_pdf.metadata.fecha_creacion else None,
                    },
                    tamaño_bytes=resumen.tamaño_bytes,
                    ocr_aplicado=resumen.ocr_aplicado,
                    usuario_id=usuario_id,
                    fecha_carga=datetime.now().isoformat(),
                )
                
                resumen.indexado_elasticsearch = resultado_idx.exito
                resumen.tiempo_indexacion_ms = int((time.time() - inicio) * 1000)
                
                if resultado_idx.exito:
                    logger.info(
                        f"✅ Documento indexado: {resultado_idx.codigos_indexados} códigos"
                    )
                else:
                    resumen.advertencias.extend(resultado_idx.errores)
                    logger.warning(f"⚠️ Errores de indexación: {resultado_idx.errores}")
            
            resumen.estado = EstadoProcesamiento.COMPLETADO
            
        except Exception as e:
            logger.exception(f"Error procesando manifiesto: {e}")
            resumen.estado = EstadoProcesamiento.ERROR
            resumen.errores.append(str(e))
        
        finally:
            resumen.fecha_fin = datetime.now()
            resumen.tiempo_total_ms = int((time.time() - inicio_total) * 1000)
            
            logger.info(
                f"Procesamiento {'completado' if resumen.exito else 'fallido'} "
                f"en {resumen.tiempo_total_ms}ms"
            )
        
        return resumen
    
    def _obtener_contenido(
        self,
        source: Union[str, Path, BinaryIO, bytes],
    ) -> bytes:
        """Obtiene los bytes del archivo desde diferentes fuentes."""
        if isinstance(source, bytes):
            return source
        elif isinstance(source, (str, Path)):
            with open(source, "rb") as f:
                return f.read()
        else:
            return source.read()
    
    def _almacenar_en_db(
        self,
        contenido: bytes,
        nombre_archivo: str,
        resultado_pdf: PDFExtractionResult,
        resultado_codigos: ResultadoExtraccionCodigos,
        usuario_id: Optional[int],
        descripcion: Optional[str],
        ocr_aplicado: bool,
    ) -> Documento:
        """Almacena el documento y códigos en la base de datos."""
        import hashlib
        import uuid
        
        # Generar nombre único para storage
        unique_name = f"{uuid.uuid4()}_{nombre_archivo}"
        storage_path = f"{settings.UPLOAD_DIR}/{unique_name}"
        
        # Calcular checksum
        checksum = hashlib.sha256(contenido).hexdigest()
        
        # Crear documento
        documento = Documento(
            nombre=unique_name,
            nombre_original=nombre_archivo,
            tipo=TipoDocumento.MANIFIESTO,
            estado=EstadoDocumento.PROCESADO,
            tamaño=len(contenido),
            paginas=resultado_pdf.metadata.total_paginas,
            descripcion=descripcion,
            storage_path=storage_path,
            content_type="application/pdf",
            checksum=checksum,
            texto_extraido=True,
            ocr_aplicado=ocr_aplicado,
            usuario_id=usuario_id,
        )
        
        self.db.add(documento)
        self.db.flush()  # Para obtener el ID
        
        # Crear códigos
        for codigo_extraido in resultado_codigos.codigos:
            codigo = Codigo(
                documento_id=documento.id,
                codigo=codigo_extraido.valor_original,
                codigo_normalizado=codigo_extraido.valor_normalizado,
                pagina=codigo_extraido.pagina,
                linea=codigo_extraido.posicion.linea,
                posicion_x=None,  # TODO: Extraer coordenadas reales del PDF
                posicion_y=None,
                contexto=codigo_extraido.contexto,
            )
            self.db.add(codigo)
        
        # Guardar archivo físico
        Path(storage_path).parent.mkdir(parents=True, exist_ok=True)
        with open(storage_path, "wb") as f:
            f.write(contenido)
        
        self.db.commit()
        
        return documento
    
    def _indexar_en_elasticsearch(
        self,
        documento_id: Optional[int],
        nombre_archivo: str,
        textos_paginas: Dict[int, str],
        codigos: List[CodigoExtraido],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Indexa el documento en ElasticSearch usando el servicio de indexación.
        
        Args:
            documento_id: ID del documento
            nombre_archivo: Nombre del archivo
            textos_paginas: Dict {pagina: texto}
            codigos: Lista de códigos extraídos
            metadata: Metadatos del documento
            
        Returns:
            True si la indexación fue exitosa
        """
        if not self.indexacion_service or not self.indexacion_service.disponible:
            logger.warning("Servicio de indexación no disponible")
            return False
        
        # Convertir textos_paginas a lista de PDFPage
        paginas = [
            PDFPage(
                numero=num,
                texto=texto,
                tiene_texto=True,
                tiene_imagenes=False,
                es_escaneado=False,
                ancho=0,
                alto=0,
                cantidad_caracteres=len(texto),
                cantidad_imagenes=0,
            )
            for num, texto in textos_paginas.items()
        ]
        
        resultado = self.indexacion_service.indexar_documento_completo(
            documento_id=documento_id or 0,
            nombre_archivo=nombre_archivo,
            tipo_documento="manifiesto",
            texto_completo="\n\n".join(textos_paginas.values()),
            paginas=paginas,
            codigos=codigos,
            metadata=metadata,
        )
        
        return resultado.exito


# Función de conveniencia para procesamiento simple
def procesar_manifiesto(
    source: Union[str, Path, BinaryIO, bytes],
    nombre_archivo: str,
    db: Optional[Session] = None,
    indexacion_service: Optional[IndexacionService] = None,
) -> ResumenProcesamiento:
    """
    Función de conveniencia para procesar un manifiesto.
    
    Args:
        source: Fuente del PDF
        nombre_archivo: Nombre del archivo
        db: Sesión de base de datos (opcional)
        indexacion_service: Servicio de indexación (opcional)
        
    Returns:
        ResumenProcesamiento
    """
    processor = ManifiestoProcessor(
        db=db,
        indexacion_service=indexacion_service,
    )
    return processor.procesar(source, nombre_archivo)

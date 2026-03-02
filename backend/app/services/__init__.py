"""Servicios de lógica de negocio."""

from app.services.pdf_extractor import (
    PDFExtractionResult,
    PDFExtractor,
    PDFMetadata,
    PDFPage,
    pdf_extractor,
)
from app.services.ocr_extractor import (
    CalidadImagen,
    ConfiguracionOCR,
    IdiomaOCR,
    OCRExtractor,
    ResultadoOCR,
    ResultadoPaginaOCR,
    crear_ocr_extractor,
    ocr_extractor,
)
from app.services.code_extractor import (
    CodigoExtraido,
    ExtractorCodigos,
    PatronCodigo,
    PosicionCodigo,
    ResultadoExtraccionCodigos,
    TipoCodigo,
    extractor_codigos,
    PATRONES_PREDEFINIDOS,
)
from app.services.manifiesto_processor import (
    EstadoProcesamiento,
    ManifiestoProcessor,
    ResumenProcesamiento,
    procesar_manifiesto,
)
from app.services.factura_processor import (
    CodigoFactura,
    FacturaProcessor,
    OrigenCodigo,
    ResultadoCargaCodigos,
    ResumenFactura,
    cargar_codigos_desde_csv,
    cargar_codigos_desde_excel,
    cargar_codigos_desde_texto,
    factura_processor,
)
from app.services.elasticsearch_config import (
    INDICES_CONFIG,
    MANIFIESTO_INDEX_MAPPING,
    CODIGO_INDEX_MAPPING,
    BUSQUEDA_INDEX_MAPPING,
    FACTURA_INDEX_MAPPING,
    get_all_index_names,
    get_index_settings,
)
from app.services.elasticsearch_service import (
    ElasticSearchService,
    get_elasticsearch_service,
)
from app.services.indexacion_service import (
    IndexacionService,
    ResultadoIndexacionDocumento,
    ResultadoIndexacionCodigo,
    ResultadoEliminacion,
    ResultadoActualizacion,
    get_indexacion_service,
)
from app.services.busqueda_service import (
    BusquedaService,
    TipoBusqueda,
    EstadoCoincidencia,
    UbicacionCodigo,
    ContextoCodigo,
    CoincidenciaCodigo,
    ResultadoBusquedaCodigo,
    ResultadoBusquedaLote,
    EstadisticasBusqueda,
    get_busqueda_service,
)
from app.services.matching_service import (
    MatchingService,
    EstadoMatch,
    TipoMatch,
    CodigoNormalizado,
    DetalleMatch,
    ResultadoCodigoMatch,
    EstadisticasMatch,
    ResultadoMatching,
    get_matching_service,
)
from app.services.pdf_highlighter import (
    ColorResaltado,
    CodigoEncontrado,
    PDFHighlighter,
    ResultadoResaltado,
    resaltar_codigos_en_pdf,
)
from app.services.ocr_service import (
    OCRService,
    OCRCache,
    OCRResult,
    OCRQuality,
    DocumentType,
    WordPosition,
    PageOCRResult,
    get_ocr_service,
    process_pdf_with_ocr,
)

__all__ = [
    # PDF Extractor
    "PDFExtractor",
    "PDFMetadata",
    "PDFPage",
    "PDFExtractionResult",
    "pdf_extractor",
    # OCR Extractor
    "OCRExtractor",
    "ConfiguracionOCR",
    "IdiomaOCR",
    "CalidadImagen",
    "ResultadoOCR",
    "ResultadoPaginaOCR",
    "crear_ocr_extractor",
    "ocr_extractor",
    # Code Extractor
    "ExtractorCodigos",
    "CodigoExtraido",
    "PatronCodigo",
    "PosicionCodigo",
    "TipoCodigo",
    "ResultadoExtraccionCodigos",
    "extractor_codigos",
    "PATRONES_PREDEFINIDOS",
    # Manifiesto Processor
    "ManifiestoProcessor",
    "ResumenProcesamiento",
    "EstadoProcesamiento",
    "procesar_manifiesto",
    # Factura Processor
    "FacturaProcessor",
    "CodigoFactura",
    "OrigenCodigo",
    "ResultadoCargaCodigos",
    "ResumenFactura",
    "factura_processor",
    "cargar_codigos_desde_texto",
    "cargar_codigos_desde_csv",
    "cargar_codigos_desde_excel",
    # ElasticSearch Config
    "INDICES_CONFIG",
    "MANIFIESTO_INDEX_MAPPING",
    "CODIGO_INDEX_MAPPING",
    "BUSQUEDA_INDEX_MAPPING",
    "FACTURA_INDEX_MAPPING",
    "get_all_index_names",
    "get_index_settings",
    # ElasticSearch Service
    "ElasticSearchService",
    "get_elasticsearch_service",
    # Indexacion Service
    "IndexacionService",
    "ResultadoIndexacionDocumento",
    "ResultadoIndexacionCodigo",
    "ResultadoEliminacion",
    "ResultadoActualizacion",
    "get_indexacion_service",
    # Busqueda Service
    "BusquedaService",
    "TipoBusqueda",
    "EstadoCoincidencia",
    "UbicacionCodigo",
    "ContextoCodigo",
    "CoincidenciaCodigo",
    "ResultadoBusquedaCodigo",
    "ResultadoBusquedaLote",
    "EstadisticasBusqueda",
    "get_busqueda_service",
    # Matching Service
    "MatchingService",
    "EstadoMatch",
    "TipoMatch",
    "CodigoNormalizado",
    "DetalleMatch",
    "ResultadoCodigoMatch",
    "EstadisticasMatch",
    "ResultadoMatching",
    "get_matching_service",
    # PDF Highlighter
    "PDFHighlighter",
    "ColorResaltado",
    "CodigoEncontrado",
    "ResultadoResaltado",
    "resaltar_codigos_en_pdf",
    # OCR Service (optimizado con OCRmyPDF)
    "OCRService",
    "OCRCache",
    "OCRResult",
    "OCRQuality",
    "DocumentType",
    "WordPosition",
    "PageOCRResult",
    "get_ocr_service",
    "process_pdf_with_ocr",
]

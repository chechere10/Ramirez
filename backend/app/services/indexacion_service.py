"""
Servicio de Indexación para ManifestoCross.
Fase 4.2 - Orquesta la indexación de documentos, códigos y metadatos en ElasticSearch.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.codigo import Codigo
from app.models.documento import Documento
from app.schemas.documento import EstadoDocumento, TipoDocumento
from app.services.code_extractor import CodigoExtraido, TipoCodigo
from app.services.elasticsearch_service import (
    ELASTICSEARCH_DISPONIBLE,
    ElasticSearchService,
    get_elasticsearch_service,
)
from app.services.pdf_extractor import PDFExtractionResult, PDFPage


# ============================================================================
# DATACLASSES DE RESULTADOS
# ============================================================================

@dataclass
class ResultadoIndexacionCodigo:
    """Resultado de indexar un código individual."""
    
    codigo: str
    codigo_normalizado: str
    indexado: bool
    es_id: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ResultadoIndexacionDocumento:
    """Resultado de indexar un documento completo."""
    
    documento_id: int
    nombre_archivo: str
    tipo_documento: str
    exito: bool
    
    # Índices creados
    manifiesto_indexado: bool = False
    manifiesto_es_id: Optional[str] = None
    
    # Códigos
    total_codigos: int = 0
    codigos_indexados: int = 0
    codigos_fallidos: int = 0
    
    # Metadatos
    total_paginas: int = 0
    caracteres_indexados: int = 0
    
    # Tiempos
    tiempo_total_ms: int = 0
    tiempo_manifiesto_ms: int = 0
    tiempo_codigos_ms: int = 0
    
    # Errores
    errores: List[str] = field(default_factory=list)
    
    # Fechas
    fecha_indexacion: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte el resultado a diccionario."""
        return {
            "documento_id": self.documento_id,
            "nombre_archivo": self.nombre_archivo,
            "tipo_documento": self.tipo_documento,
            "exito": self.exito,
            "indices": {
                "manifiesto_indexado": self.manifiesto_indexado,
                "manifiesto_es_id": self.manifiesto_es_id,
            },
            "codigos": {
                "total": self.total_codigos,
                "indexados": self.codigos_indexados,
                "fallidos": self.codigos_fallidos,
            },
            "metricas": {
                "total_paginas": self.total_paginas,
                "caracteres_indexados": self.caracteres_indexados,
            },
            "tiempos_ms": {
                "total": self.tiempo_total_ms,
                "manifiesto": self.tiempo_manifiesto_ms,
                "codigos": self.tiempo_codigos_ms,
            },
            "errores": self.errores,
            "fecha_indexacion": self.fecha_indexacion.isoformat(),
        }


@dataclass
class ResultadoEliminacion:
    """Resultado de eliminar un documento del índice."""
    
    documento_id: int
    exito: bool
    manifiesto_eliminado: bool = False
    codigos_eliminados: int = 0
    error: Optional[str] = None


@dataclass
class ResultadoActualizacion:
    """Resultado de actualizar un documento en el índice."""
    
    documento_id: int
    exito: bool
    campos_actualizados: List[str] = field(default_factory=list)
    reindexado_completo: bool = False
    error: Optional[str] = None


# ============================================================================
# SERVICIO DE INDEXACIÓN
# ============================================================================

class IndexacionService:
    """
    Servicio de indexación para ManifestoCross.
    
    Orquesta la indexación de:
    - Texto completo de manifiestos/facturas
    - Códigos individuales con metadatos
    - Metadatos del documento (páginas, posiciones)
    
    También maneja:
    - Actualización de índices existentes
    - Eliminación de documentos del índice
    - Reindexación completa o parcial
    """
    
    def __init__(
        self,
        es_service: Optional[ElasticSearchService] = None,
        db: Optional[Union[Session, AsyncSession]] = None,
    ):
        """
        Inicializa el servicio de indexación.
        
        Args:
            es_service: Servicio de ElasticSearch (usa global si no se provee)
            db: Sesión de base de datos (opcional)
        """
        self.es = es_service or get_elasticsearch_service()
        self.db = db
        
        if not self.es:
            logger.warning(
                "ElasticSearch no disponible - indexación deshabilitada"
            )
        else:
            # Conectar si no está conectado
            if not self.es.esta_conectado:
                self.es.conectar()
            # Asegurar que los índices existan
            self._inicializar_indices()
        
        logger.info("IndexacionService inicializado")
    
    def _inicializar_indices(self) -> None:
        """Crea los índices si no existen."""
        if self.es:
            # Asegurar conexión
            if not self.es.esta_conectado:
                self.es.conectar()
            if self.es.esta_conectado:
                try:
                    self.es.crear_indices(forzar=False)
                except Exception as e:
                    logger.warning(f"No se pudieron crear índices: {e}")
    
    @property
    def disponible(self) -> bool:
        """Indica si el servicio de indexación está disponible."""
        if self.es is None:
            return False
        # Intentar conectar si no está conectado
        if not self.es.esta_conectado:
            self.es.conectar()
        return self.es.esta_conectado
    
    # ========================================================================
    # INDEXACIÓN COMPLETA DE DOCUMENTO
    # ========================================================================
    
    def indexar_documento_completo(
        self,
        documento_id: int,
        nombre_archivo: str,
        tipo_documento: str,
        texto_completo: str,
        paginas: Optional[List[PDFPage]] = None,
        codigos: Optional[List[CodigoExtraido]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> ResultadoIndexacionDocumento:
        """
        Indexa un documento completo con todos sus datos.
        
        Este es el método principal que orquesta:
        1. Indexación del texto completo del manifiesto
        2. Indexación de códigos individuales
        3. Indexación de metadatos (páginas, posiciones)
        
        Args:
            documento_id: ID del documento en la BD
            nombre_archivo: Nombre del archivo original
            tipo_documento: "manifiesto" o "factura"
            texto_completo: Texto completo extraído
            paginas: Lista de páginas con texto
            codigos: Lista de códigos extraídos
            metadata: Metadatos del PDF
            **kwargs: Datos adicionales
            
        Returns:
            ResultadoIndexacionDocumento con el resumen
        """
        import time
        inicio = time.time()
        
        resultado = ResultadoIndexacionDocumento(
            documento_id=documento_id,
            nombre_archivo=nombre_archivo,
            tipo_documento=tipo_documento,
            exito=False,
        )
        
        if not self.disponible:
            resultado.errores.append("ElasticSearch no disponible")
            return resultado
        
        try:
            # ----------------------------------------------------------------
            # 1. INDEXAR MANIFIESTO/FACTURA (texto completo + metadatos)
            # ----------------------------------------------------------------
            inicio_manifiesto = time.time()
            
            manifiesto_result = self._indexar_texto_manifiesto(
                documento_id=documento_id,
                nombre_archivo=nombre_archivo,
                tipo_documento=tipo_documento,
                texto_completo=texto_completo,
                paginas=paginas,
                codigos=codigos,
                metadata=metadata,
                **kwargs,
            )
            
            resultado.tiempo_manifiesto_ms = int(
                (time.time() - inicio_manifiesto) * 1000
            )
            resultado.manifiesto_indexado = manifiesto_result is not None
            resultado.manifiesto_es_id = manifiesto_result
            resultado.total_paginas = len(paginas) if paginas else 0
            resultado.caracteres_indexados = len(texto_completo)
            
            if not manifiesto_result:
                resultado.errores.append("Error indexando texto del manifiesto")
            
            # ----------------------------------------------------------------
            # 2. INDEXAR CÓDIGOS INDIVIDUALES
            # ----------------------------------------------------------------
            if codigos:
                inicio_codigos = time.time()
                
                codigos_result = self._indexar_codigos_documento(
                    documento_id=documento_id,
                    nombre_documento=nombre_archivo,
                    codigos=codigos,
                )
                
                resultado.tiempo_codigos_ms = int(
                    (time.time() - inicio_codigos) * 1000
                )
                resultado.total_codigos = len(codigos)
                resultado.codigos_indexados = codigos_result[0]
                resultado.codigos_fallidos = codigos_result[1]
                
                if codigos_result[1] > 0:
                    resultado.errores.append(
                        f"{codigos_result[1]} códigos no se pudieron indexar"
                    )
            
            # ----------------------------------------------------------------
            # 3. FINALIZAR
            # ----------------------------------------------------------------
            resultado.tiempo_total_ms = int((time.time() - inicio) * 1000)
            resultado.exito = resultado.manifiesto_indexado
            
            # Refresh para que los datos estén disponibles inmediatamente
            self.es.refresh_indices()
            
            logger.info(
                f"✅ Documento indexado: {documento_id} - "
                f"{resultado.codigos_indexados} códigos en "
                f"{resultado.tiempo_total_ms}ms"
            )
            
        except Exception as e:
            logger.exception(f"Error indexando documento: {e}")
            resultado.errores.append(str(e))
            resultado.tiempo_total_ms = int((time.time() - inicio) * 1000)
        
        return resultado
    
    # ========================================================================
    # INDEXACIÓN DE TEXTO DEL MANIFIESTO
    # ========================================================================
    
    def _indexar_texto_manifiesto(
        self,
        documento_id: int,
        nombre_archivo: str,
        tipo_documento: str,
        texto_completo: str,
        paginas: Optional[List[PDFPage]] = None,
        codigos: Optional[List[CodigoExtraido]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> Optional[str]:
        """
        Indexa el texto completo de un manifiesto.
        
        Args:
            documento_id: ID del documento
            nombre_archivo: Nombre del archivo
            tipo_documento: Tipo de documento
            texto_completo: Texto completo
            paginas: Lista de páginas con texto
            codigos: Códigos extraídos (para resumen)
            metadata: Metadatos del PDF
            **kwargs: Datos adicionales
            
        Returns:
            ID del documento en ElasticSearch o None
        """
        # Preparar texto por página
        texto_por_pagina = None
        if paginas:
            texto_por_pagina = {
                p.numero: p.texto for p in paginas if p.texto.strip()
            }
        
        # Preparar resumen de códigos
        codigos_resumen = None
        tipos_codigo = set()
        codigos_unicos = 0
        
        if codigos:
            # Códigos únicos normalizados
            codigos_set = set()
            for c in codigos:
                codigos_set.add(c.valor_normalizado)
                tipos_codigo.add(c.tipo.value if hasattr(c.tipo, 'value') else str(c.tipo))
            
            codigos_resumen = list(codigos_set)
            codigos_unicos = len(codigos_set)
        
        # Preparar metadatos
        metadata_indexar = {}
        if metadata:
            metadata_indexar = {
                "autor": metadata.get("autor"),
                "titulo": metadata.get("titulo"),
                "asunto": metadata.get("asunto"),
                "creador": metadata.get("creador"),
                "productor": metadata.get("productor"),
                "fecha_creacion": metadata.get("fecha_creacion"),
                "fecha_modificacion": metadata.get("fecha_modificacion"),
            }
        
        # Llamar al servicio de ElasticSearch
        return self.es.indexar_manifiesto(
            documento_id=documento_id,
            nombre_archivo=nombre_archivo,
            texto_completo=texto_completo,
            texto_por_pagina=texto_por_pagina,
            metadata=metadata_indexar,
            codigos_resumen=codigos_resumen,
            tipo_documento=tipo_documento,
            total_paginas=len(paginas) if paginas else 0,
            total_codigos=len(codigos) if codigos else 0,
            codigos_unicos=codigos_unicos,
            tamaño_bytes=kwargs.get("tamaño_bytes", 0),
            ocr_aplicado=kwargs.get("ocr_aplicado", False),
            tipos_codigo=list(tipos_codigo),
            usuario_id=kwargs.get("usuario_id"),
            fecha_carga=kwargs.get("fecha_carga"),
            estado="indexado",
        )
    
    # ========================================================================
    # INDEXACIÓN DE CÓDIGOS
    # ========================================================================
    
    def _indexar_codigos_documento(
        self,
        documento_id: int,
        nombre_documento: str,
        codigos: List[CodigoExtraido],
    ) -> Tuple[int, int]:
        """
        Indexa todos los códigos de un documento.
        
        Args:
            documento_id: ID del documento
            nombre_documento: Nombre del documento
            codigos: Lista de códigos extraídos
            
        Returns:
            Tuple (exitosos, fallidos)
        """
        if not codigos:
            return (0, 0)
        
        # Preparar datos para bulk indexación
        codigos_data = []
        codigos_vistos = set()  # Para detectar duplicados
        
        for cod in codigos:
            codigo_normalizado = cod.valor_normalizado
            clave = f"{codigo_normalizado}_{cod.pagina}"
            
            es_duplicado = clave in codigos_vistos
            codigos_vistos.add(clave)
            
            codigo_dict = {
                "codigo": cod.valor_original,
                "codigo_normalizado": codigo_normalizado,
                "tipo": cod.tipo.value if hasattr(cod.tipo, 'value') else str(cod.tipo),
                "pagina": cod.pagina,
                "linea": cod.posicion.linea if cod.posicion else 0,
                "columna": cod.posicion.columna if cod.posicion else 0,
                "posicion_inicio": cod.posicion.inicio if cod.posicion else 0,
                "posicion_fin": cod.posicion.fin if cod.posicion else 0,
                "contexto": cod.contexto or "",
                "es_valido": True,
                "patron_usado": cod.patron_usado,
                "frecuencia": 1,
                "es_duplicado": es_duplicado,
                "fecha_extraccion": datetime.now().isoformat(),
            }
            codigos_data.append(codigo_dict)
        
        # Usar bulk indexación
        return self.es.indexar_codigos_bulk(
            codigos=codigos_data,
            documento_id=documento_id,
            nombre_documento=nombre_documento,
        )
    
    def indexar_codigo_individual(
        self,
        documento_id: int,
        nombre_documento: str,
        codigo: CodigoExtraido,
    ) -> ResultadoIndexacionCodigo:
        """
        Indexa un código individual.
        
        Args:
            documento_id: ID del documento
            nombre_documento: Nombre del documento
            codigo: Código a indexar
            
        Returns:
            ResultadoIndexacionCodigo
        """
        resultado = ResultadoIndexacionCodigo(
            codigo=codigo.valor_original,
            codigo_normalizado=codigo.valor_normalizado,
            indexado=False,
        )
        
        if not self.disponible:
            resultado.error = "ElasticSearch no disponible"
            return resultado
        
        try:
            es_id = self.es.indexar_codigo(
                documento_id=documento_id,
                codigo=codigo.valor_original,
                tipo_codigo=codigo.tipo.value if hasattr(codigo.tipo, 'value') else str(codigo.tipo),
                pagina=codigo.pagina,
                nombre_documento=nombre_documento,
                linea=codigo.posicion.linea if codigo.posicion else 0,
                columna=codigo.posicion.columna if codigo.posicion else 0,
                posicion_inicio=codigo.posicion.inicio if codigo.posicion else 0,
                posicion_fin=codigo.posicion.fin if codigo.posicion else 0,
                contexto=codigo.contexto or "",
                patron_usado=codigo.patron_usado,
                es_valido=True,
            )
            
            if es_id:
                resultado.indexado = True
                resultado.es_id = es_id
            else:
                resultado.error = "No se pudo indexar el código"
                
        except Exception as e:
            resultado.error = str(e)
            logger.error(f"Error indexando código individual: {e}")
        
        return resultado
    
    # ========================================================================
    # ACTUALIZACIÓN DE ÍNDICE
    # ========================================================================
    
    def actualizar_documento(
        self,
        documento_id: int,
        campos: Dict[str, Any],
        reindexar_codigos: bool = False,
        codigos: Optional[List[CodigoExtraido]] = None,
        nombre_documento: str = "",
    ) -> ResultadoActualizacion:
        """
        Actualiza un documento en el índice.
        
        Args:
            documento_id: ID del documento
            campos: Campos a actualizar
            reindexar_codigos: Si True, reindexar todos los códigos
            codigos: Nuevos códigos (si reindexar_codigos=True)
            nombre_documento: Nombre del documento
            
        Returns:
            ResultadoActualizacion
        """
        resultado = ResultadoActualizacion(
            documento_id=documento_id,
            exito=False,
        )
        
        if not self.disponible:
            resultado.error = "ElasticSearch no disponible"
            return resultado
        
        try:
            # Actualizar documento principal
            campos["fecha_ultima_modificacion"] = datetime.now().isoformat()
            campos["version"] = campos.get("version", 1) + 1
            
            self.es.client.update(
                index=self.es.index_manifiestos,
                id=str(documento_id),
                body={"doc": campos}
            )
            
            resultado.campos_actualizados = list(campos.keys())
            resultado.exito = True
            
            # Reindexar códigos si se solicita
            if reindexar_codigos and codigos:
                # Eliminar códigos anteriores
                self.es.client.delete_by_query(
                    index=self.es.index_codigos,
                    body={
                        "query": {
                            "term": {"documento_id": documento_id}
                        }
                    }
                )
                
                # Indexar nuevos códigos
                exitosos, fallidos = self._indexar_codigos_documento(
                    documento_id=documento_id,
                    nombre_documento=nombre_documento,
                    codigos=codigos,
                )
                
                resultado.reindexado_completo = True
                logger.info(
                    f"Códigos reindexados: {exitosos} exitosos, {fallidos} fallidos"
                )
            
            self.es.refresh_indices()
            logger.info(f"Documento {documento_id} actualizado en ES")
            
        except Exception as e:
            resultado.error = str(e)
            logger.error(f"Error actualizando documento: {e}")
        
        return resultado
    
    def actualizar_estado_documento(
        self,
        documento_id: int,
        estado: str,
    ) -> bool:
        """
        Actualiza el estado de un documento en el índice.
        
        Args:
            documento_id: ID del documento
            estado: Nuevo estado
            
        Returns:
            True si se actualizó correctamente
        """
        resultado = self.actualizar_documento(
            documento_id=documento_id,
            campos={"estado": estado}
        )
        return resultado.exito
    
    # ========================================================================
    # ELIMINACIÓN DE ÍNDICE
    # ========================================================================
    
    def eliminar_documento(
        self,
        documento_id: int,
        eliminar_codigos: bool = True,
    ) -> ResultadoEliminacion:
        """
        Elimina un documento y sus códigos del índice.
        
        Args:
            documento_id: ID del documento
            eliminar_codigos: Si True, también elimina los códigos
            
        Returns:
            ResultadoEliminacion
        """
        resultado = ResultadoEliminacion(
            documento_id=documento_id,
            exito=False,
        )
        
        if not self.disponible:
            resultado.error = "ElasticSearch no disponible"
            return resultado
        
        try:
            # Eliminar documento principal
            try:
                self.es.client.delete(
                    index=self.es.index_manifiestos,
                    id=str(documento_id)
                )
                resultado.manifiesto_eliminado = True
            except Exception as e:
                if "not_found" not in str(e).lower():
                    raise
                logger.warning(f"Documento {documento_id} no encontrado en ES")
            
            # Eliminar códigos asociados
            if eliminar_codigos:
                delete_result = self.es.client.delete_by_query(
                    index=self.es.index_codigos,
                    body={
                        "query": {
                            "term": {"documento_id": documento_id}
                        }
                    }
                )
                resultado.codigos_eliminados = delete_result.get("deleted", 0)
            
            resultado.exito = True
            self.es.refresh_indices()
            
            logger.info(
                f"🗑️ Documento {documento_id} eliminado de ES "
                f"({resultado.codigos_eliminados} códigos)"
            )
            
        except Exception as e:
            resultado.error = str(e)
            logger.error(f"Error eliminando documento de ES: {e}")
        
        return resultado
    
    def eliminar_codigos_documento(
        self,
        documento_id: int,
    ) -> int:
        """
        Elimina todos los códigos de un documento.
        
        Args:
            documento_id: ID del documento
            
        Returns:
            Número de códigos eliminados
        """
        if not self.disponible:
            return 0
        
        try:
            result = self.es.client.delete_by_query(
                index=self.es.index_codigos,
                body={
                    "query": {
                        "term": {"documento_id": documento_id}
                    }
                }
            )
            
            eliminados = result.get("deleted", 0)
            self.es.refresh_indices()
            
            logger.info(
                f"Eliminados {eliminados} códigos del documento {documento_id}"
            )
            return eliminados
            
        except Exception as e:
            logger.error(f"Error eliminando códigos: {e}")
            return 0
    
    # ========================================================================
    # REINDEXACIÓN
    # ========================================================================
    
    def reindexar_documento_completo(
        self,
        documento_id: int,
        nombre_archivo: str,
        tipo_documento: str,
        texto_completo: str,
        paginas: Optional[List[PDFPage]] = None,
        codigos: Optional[List[CodigoExtraido]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> ResultadoIndexacionDocumento:
        """
        Reindexación completa: elimina y vuelve a indexar.
        
        Args:
            documento_id: ID del documento
            ... (mismos parámetros que indexar_documento_completo)
            
        Returns:
            ResultadoIndexacionDocumento
        """
        # Primero eliminar
        self.eliminar_documento(documento_id, eliminar_codigos=True)
        
        # Luego indexar de nuevo
        return self.indexar_documento_completo(
            documento_id=documento_id,
            nombre_archivo=nombre_archivo,
            tipo_documento=tipo_documento,
            texto_completo=texto_completo,
            paginas=paginas,
            codigos=codigos,
            metadata=metadata,
            **kwargs,
        )
    
    # ========================================================================
    # CONSULTAS DE ESTADO
    # ========================================================================
    
    def documento_indexado(self, documento_id: int) -> bool:
        """
        Verifica si un documento está indexado.
        
        Args:
            documento_id: ID del documento
            
        Returns:
            True si está indexado
        """
        if not self.disponible:
            return False
        
        try:
            return self.es.client.exists(
                index=self.es.index_manifiestos,
                id=str(documento_id)
            )
        except Exception:
            return False
    
    def obtener_info_documento(
        self,
        documento_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Obtiene información de un documento indexado.
        
        Args:
            documento_id: ID del documento
            
        Returns:
            Dict con información o None
        """
        if not self.disponible:
            return None
        
        try:
            result = self.es.client.get(
                index=self.es.index_manifiestos,
                id=str(documento_id)
            )
            return result["_source"]
        except Exception:
            return None
    
    def contar_codigos_documento(self, documento_id: int) -> int:
        """
        Cuenta los códigos indexados de un documento.
        
        Args:
            documento_id: ID del documento
            
        Returns:
            Número de códigos
        """
        if not self.disponible:
            return 0
        
        try:
            result = self.es.client.count(
                index=self.es.index_codigos,
                body={
                    "query": {
                        "term": {"documento_id": documento_id}
                    }
                }
            )
            return result["count"]
        except Exception:
            return 0
    
    def estadisticas(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas del servicio de indexación.
        
        Returns:
            Dict con estadísticas
        """
        if not self.disponible:
            return {"disponible": False}
        
        info = self.es.obtener_info_indices()
        
        return {
            "disponible": True,
            "conectado": self.es.esta_conectado,
            "indices": info,
            "total_manifiestos": self.es.contar_documentos(
                self.es.index_manifiestos
            ),
            "total_codigos": self.es.contar_documentos(
                self.es.index_codigos
            ),
        }


# ============================================================================
# INSTANCIA GLOBAL
# ============================================================================

_indexacion_service: Optional[IndexacionService] = None


def get_indexacion_service() -> Optional[IndexacionService]:
    """Obtiene la instancia global del servicio de indexación."""
    global _indexacion_service
    
    if not ELASTICSEARCH_DISPONIBLE:
        return None
    
    if _indexacion_service is None:
        try:
            _indexacion_service = IndexacionService()
        except Exception as e:
            logger.warning(f"No se pudo inicializar IndexacionService: {e}")
            return None
    
    return _indexacion_service

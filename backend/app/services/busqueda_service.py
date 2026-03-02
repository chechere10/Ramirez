"""
Servicio de Búsqueda para ManifestoCross.
Fase 4.3 - Motor de búsqueda completo con soporte para búsqueda exacta,
fuzzy, por lotes, y optimizaciones de performance.
"""

import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from loguru import logger

from app.core.config import settings
from app.services.elasticsearch_service import (
    ELASTICSEARCH_DISPONIBLE,
    ElasticSearchService,
    get_elasticsearch_service,
)


# ============================================================================
# ENUMS Y CONSTANTES
# ============================================================================

class TipoBusqueda(str, Enum):
    """Tipos de búsqueda disponibles."""
    
    EXACTA = "exacta"
    FUZZY = "fuzzy"
    PREFIJO = "prefijo"
    WILDCARD = "wildcard"
    NORMALIZADA = "normalizada"


class EstadoCoincidencia(str, Enum):
    """Estado de una coincidencia de código."""
    
    ENCONTRADO = "encontrado"
    NO_ENCONTRADO = "no_encontrado"
    PARCIAL = "parcial"  # Coincidencia fuzzy/parcial


# ============================================================================
# DATACLASSES DE RESULTADOS
# ============================================================================

@dataclass
class UbicacionCodigo:
    """Ubicación exacta de un código en el documento."""
    
    pagina: int
    linea: int = 0
    columna: int = 0
    posicion_inicio: int = 0
    posicion_fin: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "pagina": self.pagina,
            "linea": self.linea,
            "columna": self.columna,
            "posicion_inicio": self.posicion_inicio,
            "posicion_fin": self.posicion_fin,
        }


@dataclass
class ContextoCodigo:
    """Contexto textual alrededor de un código encontrado."""
    
    texto: str = ""
    texto_antes: str = ""
    texto_despues: str = ""
    resaltado: str = ""  # Con marcas de resaltado <mark>...</mark>
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "texto": self.texto,
            "texto_antes": self.texto_antes,
            "texto_despues": self.texto_despues,
            "resaltado": self.resaltado,
        }


@dataclass
class CoincidenciaCodigo:
    """Representa una coincidencia de código encontrada."""
    
    codigo_buscado: str
    codigo_encontrado: str
    codigo_normalizado: str
    documento_id: int
    nombre_documento: str
    tipo_codigo: str
    ubicacion: UbicacionCodigo
    contexto: ContextoCodigo
    score: float = 0.0  # Relevancia de la coincidencia
    tipo_busqueda: TipoBusqueda = TipoBusqueda.EXACTA
    es_exacto: bool = True  # True si coincide exactamente
    similitud: float = 1.0  # 0-1, qué tan similar es
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "codigo_buscado": self.codigo_buscado,
            "codigo_encontrado": self.codigo_encontrado,
            "codigo_normalizado": self.codigo_normalizado,
            "documento_id": self.documento_id,
            "nombre_documento": self.nombre_documento,
            "tipo_codigo": self.tipo_codigo,
            "ubicacion": self.ubicacion.to_dict(),
            "contexto": self.contexto.to_dict(),
            "score": self.score,
            "tipo_busqueda": self.tipo_busqueda.value,
            "es_exacto": self.es_exacto,
            "similitud": self.similitud,
        }


@dataclass
class ResultadoBusquedaCodigo:
    """Resultado de búsqueda para un código específico."""
    
    codigo: str
    codigo_normalizado: str
    estado: EstadoCoincidencia
    coincidencias: List[CoincidenciaCodigo] = field(default_factory=list)
    total_coincidencias: int = 0
    documentos_encontrado: List[int] = field(default_factory=list)
    paginas_encontrado: List[int] = field(default_factory=list)
    tiempo_busqueda_ms: int = 0
    
    @property
    def encontrado(self) -> bool:
        return self.estado == EstadoCoincidencia.ENCONTRADO
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "codigo": self.codigo,
            "codigo_normalizado": self.codigo_normalizado,
            "estado": self.estado.value,
            "encontrado": self.encontrado,
            "total_coincidencias": self.total_coincidencias,
            "documentos_encontrado": self.documentos_encontrado,
            "paginas_encontrado": self.paginas_encontrado,
            "tiempo_busqueda_ms": self.tiempo_busqueda_ms,
            "coincidencias": [c.to_dict() for c in self.coincidencias],
        }


@dataclass
class ResultadoBusquedaLote:
    """Resultado de búsqueda por lotes (múltiples códigos)."""
    
    codigos_buscados: List[str] = field(default_factory=list)
    total_buscados: int = 0
    total_encontrados: int = 0
    total_no_encontrados: int = 0
    total_parciales: int = 0
    porcentaje_encontrados: float = 0.0
    
    resultados: Dict[str, ResultadoBusquedaCodigo] = field(default_factory=dict)
    
    encontrados: List[str] = field(default_factory=list)
    no_encontrados: List[str] = field(default_factory=list)
    parciales: List[str] = field(default_factory=list)
    
    tiempo_total_ms: int = 0
    tiempo_promedio_por_codigo_ms: float = 0.0
    
    # Metadatos
    tipo_busqueda: TipoBusqueda = TipoBusqueda.EXACTA
    documento_id: Optional[int] = None
    fecha_busqueda: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "resumen": {
                "total_buscados": self.total_buscados,
                "total_encontrados": self.total_encontrados,
                "total_no_encontrados": self.total_no_encontrados,
                "total_parciales": self.total_parciales,
                "porcentaje_encontrados": round(self.porcentaje_encontrados, 2),
            },
            "listas": {
                "encontrados": self.encontrados,
                "no_encontrados": self.no_encontrados,
                "parciales": self.parciales,
            },
            "tiempos": {
                "total_ms": self.tiempo_total_ms,
                "promedio_por_codigo_ms": round(self.tiempo_promedio_por_codigo_ms, 2),
            },
            "configuracion": {
                "tipo_busqueda": self.tipo_busqueda.value,
                "documento_id": self.documento_id,
                "fecha_busqueda": self.fecha_busqueda.isoformat(),
            },
            "resultados": {
                codigo: r.to_dict() for codigo, r in self.resultados.items()
            },
        }


@dataclass
class EstadisticasBusqueda:
    """Estadísticas de una sesión de búsqueda."""
    
    total_busquedas: int = 0
    codigos_unicos_buscados: int = 0
    documentos_consultados: int = 0
    coincidencias_totales: int = 0
    tiempo_total_ms: int = 0
    busquedas_por_tipo: Dict[str, int] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_busquedas": self.total_busquedas,
            "codigos_unicos_buscados": self.codigos_unicos_buscados,
            "documentos_consultados": self.documentos_consultados,
            "coincidencias_totales": self.coincidencias_totales,
            "tiempo_total_ms": self.tiempo_total_ms,
            "busquedas_por_tipo": self.busquedas_por_tipo,
        }


# ============================================================================
# SERVICIO DE BÚSQUEDA
# ============================================================================

class BusquedaService:
    """
    Servicio de búsqueda para ManifestoCross.
    
    Proporciona:
    - Búsqueda exacta de códigos
    - Búsqueda fuzzy (tolerante a errores)
    - Búsqueda por lotes (múltiples códigos)
    - Contexto de cada coincidencia
    - Ubicación exacta (página, línea)
    - Optimizaciones para búsquedas masivas
    """
    
    # Configuración de búsqueda
    LIMITE_RESULTADOS_DEFAULT = 100
    LIMITE_LOTE_PARALELO = 50  # Máx códigos a buscar en paralelo
    FUZZINESS_DEFAULT = "AUTO"
    CONTEXTO_CHARS = 100  # Caracteres de contexto a incluir
    
    def __init__(
        self,
        es_service: Optional[ElasticSearchService] = None,
    ):
        """
        Inicializa el servicio de búsqueda.
        
        Args:
            es_service: Servicio de ElasticSearch (usa global si no se provee)
        """
        self.es = es_service or get_elasticsearch_service()
        
        if not self.es:
            logger.warning("ElasticSearch no disponible - búsqueda deshabilitada")
        else:
            if not self.es.esta_conectado:
                self.es.conectar()
        
        # Estadísticas de sesión
        self._stats = EstadisticasBusqueda()
        
        logger.info("BusquedaService inicializado")
    
    @property
    def disponible(self) -> bool:
        """Indica si el servicio está disponible."""
        if self.es is None:
            return False
        if not self.es.esta_conectado:
            self.es.conectar()
        return self.es.esta_conectado
    
    # ========================================================================
    # BÚSQUEDA EXACTA
    # ========================================================================
    
    def buscar_exacto(
        self,
        codigo: str,
        documento_id: Optional[int] = None,
        limite: int = LIMITE_RESULTADOS_DEFAULT,
        incluir_contexto: bool = True,
    ) -> ResultadoBusquedaCodigo:
        """
        Busca un código con coincidencia exacta.
        
        Args:
            codigo: Código a buscar
            documento_id: Filtrar por documento (opcional)
            limite: Máximo de resultados
            incluir_contexto: Si incluir texto de contexto
            
        Returns:
            ResultadoBusquedaCodigo con las coincidencias
        """
        inicio = time.time()
        codigo_normalizado = self._normalizar_codigo(codigo)
        
        resultado = ResultadoBusquedaCodigo(
            codigo=codigo,
            codigo_normalizado=codigo_normalizado,
            estado=EstadoCoincidencia.NO_ENCONTRADO,
        )
        
        if not self.disponible:
            logger.warning("Servicio de búsqueda no disponible")
            return resultado
        
        try:
            # Ejecutar búsqueda exacta
            hits = self.es.buscar_codigo_exacto(codigo, documento_id, limite)
            
            # Procesar resultados
            coincidencias = self._procesar_hits(
                hits, codigo, TipoBusqueda.EXACTA, incluir_contexto
            )
            
            if coincidencias:
                resultado.estado = EstadoCoincidencia.ENCONTRADO
                resultado.coincidencias = coincidencias
                resultado.total_coincidencias = len(coincidencias)
                resultado.documentos_encontrado = list(set(
                    c.documento_id for c in coincidencias
                ))
                resultado.paginas_encontrado = list(set(
                    c.ubicacion.pagina for c in coincidencias
                ))
            
        except Exception as e:
            logger.error(f"Error en búsqueda exacta: {e}")
        
        resultado.tiempo_busqueda_ms = int((time.time() - inicio) * 1000)
        self._actualizar_stats(TipoBusqueda.EXACTA, resultado)
        
        return resultado
    
    # ========================================================================
    # BÚSQUEDA FUZZY
    # ========================================================================
    
    def buscar_fuzzy(
        self,
        codigo: str,
        documento_id: Optional[int] = None,
        fuzziness: str = FUZZINESS_DEFAULT,
        limite: int = LIMITE_RESULTADOS_DEFAULT,
        incluir_contexto: bool = True,
        umbral_similitud: float = 0.7,
    ) -> ResultadoBusquedaCodigo:
        """
        Busca un código con tolerancia a errores (fuzzy).
        
        Args:
            codigo: Código a buscar
            documento_id: Filtrar por documento (opcional)
            fuzziness: Nivel de tolerancia (AUTO, 0, 1, 2)
            limite: Máximo de resultados
            incluir_contexto: Si incluir texto de contexto
            umbral_similitud: Mínima similitud para considerar match (0-1)
            
        Returns:
            ResultadoBusquedaCodigo con las coincidencias
        """
        inicio = time.time()
        codigo_normalizado = self._normalizar_codigo(codigo)
        
        resultado = ResultadoBusquedaCodigo(
            codigo=codigo,
            codigo_normalizado=codigo_normalizado,
            estado=EstadoCoincidencia.NO_ENCONTRADO,
        )
        
        if not self.disponible:
            return resultado
        
        try:
            # Ejecutar búsqueda fuzzy
            hits = self.es.buscar_codigo_fuzzy(codigo, documento_id, fuzziness, limite)
            
            # Procesar resultados
            coincidencias = self._procesar_hits(
                hits, codigo, TipoBusqueda.FUZZY, incluir_contexto
            )
            
            # Filtrar por umbral de similitud
            coincidencias_filtradas = [
                c for c in coincidencias if c.similitud >= umbral_similitud
            ]
            
            if coincidencias_filtradas:
                # Determinar si hay coincidencia exacta o parcial
                tiene_exacta = any(c.es_exacto for c in coincidencias_filtradas)
                resultado.estado = (
                    EstadoCoincidencia.ENCONTRADO if tiene_exacta 
                    else EstadoCoincidencia.PARCIAL
                )
                resultado.coincidencias = coincidencias_filtradas
                resultado.total_coincidencias = len(coincidencias_filtradas)
                resultado.documentos_encontrado = list(set(
                    c.documento_id for c in coincidencias_filtradas
                ))
                resultado.paginas_encontrado = list(set(
                    c.ubicacion.pagina for c in coincidencias_filtradas
                ))
            
        except Exception as e:
            logger.error(f"Error en búsqueda fuzzy: {e}")
        
        resultado.tiempo_busqueda_ms = int((time.time() - inicio) * 1000)
        self._actualizar_stats(TipoBusqueda.FUZZY, resultado)
        
        return resultado
    
    # ========================================================================
    # BÚSQUEDA POR LOTES (MÚLTIPLES CÓDIGOS)
    # ========================================================================
    
    def buscar_lote(
        self,
        codigos: List[str],
        documento_id: Optional[int] = None,
        tipo_busqueda: TipoBusqueda = TipoBusqueda.EXACTA,
        fuzziness: str = FUZZINESS_DEFAULT,
        incluir_contexto: bool = True,
        usar_optimizacion: bool = True,
    ) -> ResultadoBusquedaLote:
        """
        Busca múltiples códigos a la vez (búsqueda por lotes).
        
        Args:
            codigos: Lista de códigos a buscar
            documento_id: Filtrar por documento (opcional)
            tipo_busqueda: Tipo de búsqueda (exacta/fuzzy)
            fuzziness: Nivel de fuzzy si aplica
            incluir_contexto: Si incluir texto de contexto
            usar_optimizacion: Si usar búsqueda masiva optimizada
            
        Returns:
            ResultadoBusquedaLote con todos los resultados
        """
        inicio = time.time()
        
        # Normalizar lista de códigos (eliminar duplicados y vacíos)
        codigos_limpios = list(dict.fromkeys(
            c.strip() for c in codigos if c and c.strip()
        ))
        
        resultado = ResultadoBusquedaLote(
            codigos_buscados=codigos_limpios,
            total_buscados=len(codigos_limpios),
            tipo_busqueda=tipo_busqueda,
            documento_id=documento_id,
        )
        
        if not self.disponible:
            resultado.no_encontrados = codigos_limpios
            resultado.total_no_encontrados = len(codigos_limpios)
            return resultado
        
        if not codigos_limpios:
            return resultado
        
        try:
            if usar_optimizacion and len(codigos_limpios) > 5:
                # Usar búsqueda masiva optimizada
                resultado = self._buscar_lote_optimizado(
                    codigos_limpios, documento_id, tipo_busqueda, 
                    fuzziness, incluir_contexto, resultado
                )
            else:
                # Búsqueda individual para lotes pequeños
                resultado = self._buscar_lote_individual(
                    codigos_limpios, documento_id, tipo_busqueda,
                    fuzziness, incluir_contexto, resultado
                )
            
            # Calcular estadísticas finales
            resultado.porcentaje_encontrados = (
                (resultado.total_encontrados / resultado.total_buscados * 100)
                if resultado.total_buscados > 0 else 0
            )
            
        except Exception as e:
            logger.error(f"Error en búsqueda por lotes: {e}")
        
        resultado.tiempo_total_ms = int((time.time() - inicio) * 1000)
        resultado.tiempo_promedio_por_codigo_ms = (
            resultado.tiempo_total_ms / len(codigos_limpios)
            if codigos_limpios else 0
        )
        
        logger.info(
            f"Búsqueda lote: {resultado.total_encontrados}/{resultado.total_buscados} "
            f"encontrados en {resultado.tiempo_total_ms}ms"
        )
        
        return resultado
    
    def _buscar_lote_individual(
        self,
        codigos: List[str],
        documento_id: Optional[int],
        tipo_busqueda: TipoBusqueda,
        fuzziness: str,
        incluir_contexto: bool,
        resultado: ResultadoBusquedaLote,
    ) -> ResultadoBusquedaLote:
        """Búsqueda de lote código por código."""
        for codigo in codigos:
            if tipo_busqueda == TipoBusqueda.FUZZY:
                res_codigo = self.buscar_fuzzy(
                    codigo, documento_id, fuzziness, 
                    incluir_contexto=incluir_contexto
                )
            else:
                res_codigo = self.buscar_exacto(
                    codigo, documento_id,
                    incluir_contexto=incluir_contexto
                )
            
            resultado.resultados[codigo] = res_codigo
            
            if res_codigo.estado == EstadoCoincidencia.ENCONTRADO:
                resultado.encontrados.append(codigo)
                resultado.total_encontrados += 1
            elif res_codigo.estado == EstadoCoincidencia.PARCIAL:
                resultado.parciales.append(codigo)
                resultado.total_parciales += 1
            else:
                resultado.no_encontrados.append(codigo)
                resultado.total_no_encontrados += 1
        
        return resultado
    
    def _buscar_lote_optimizado(
        self,
        codigos: List[str],
        documento_id: Optional[int],
        tipo_busqueda: TipoBusqueda,
        fuzziness: str,
        incluir_contexto: bool,
        resultado: ResultadoBusquedaLote,
    ) -> ResultadoBusquedaLote:
        """
        Búsqueda de lote optimizada usando multi-search de ElasticSearch.
        
        Usa msearch para enviar múltiples queries en una sola petición,
        mejorando significativamente el rendimiento para lotes grandes.
        """
        try:
            # Construir todas las queries
            searches = []
            for codigo in codigos:
                codigo_norm = self._normalizar_codigo(codigo)
                
                if tipo_busqueda == TipoBusqueda.FUZZY:
                    query = self._construir_query_fuzzy(codigo, documento_id, fuzziness)
                else:
                    query = self._construir_query_exacta(codigo, documento_id)
                
                # Header y body para msearch
                searches.append({"index": self.es.index_codigos})
                searches.append({"query": query, "size": 50})
            
            # Ejecutar multi-search
            responses = self.es.client.msearch(body=searches)
            
            # Procesar respuestas
            for i, response in enumerate(responses.get("responses", [])):
                codigo = codigos[i]
                codigo_norm = self._normalizar_codigo(codigo)
                
                res_codigo = ResultadoBusquedaCodigo(
                    codigo=codigo,
                    codigo_normalizado=codigo_norm,
                    estado=EstadoCoincidencia.NO_ENCONTRADO,
                )
                
                hits = response.get("hits", {}).get("hits", [])
                if hits:
                    coincidencias = self._procesar_hits_raw(
                        hits, codigo, tipo_busqueda, incluir_contexto
                    )
                    
                    if coincidencias:
                        tiene_exacta = any(c.es_exacto for c in coincidencias)
                        res_codigo.estado = (
                            EstadoCoincidencia.ENCONTRADO if tiene_exacta
                            else EstadoCoincidencia.PARCIAL
                        )
                        res_codigo.coincidencias = coincidencias
                        res_codigo.total_coincidencias = len(coincidencias)
                        res_codigo.documentos_encontrado = list(set(
                            c.documento_id for c in coincidencias
                        ))
                        res_codigo.paginas_encontrado = list(set(
                            c.ubicacion.pagina for c in coincidencias
                        ))
                
                resultado.resultados[codigo] = res_codigo
                
                if res_codigo.estado == EstadoCoincidencia.ENCONTRADO:
                    resultado.encontrados.append(codigo)
                    resultado.total_encontrados += 1
                elif res_codigo.estado == EstadoCoincidencia.PARCIAL:
                    resultado.parciales.append(codigo)
                    resultado.total_parciales += 1
                else:
                    resultado.no_encontrados.append(codigo)
                    resultado.total_no_encontrados += 1
            
        except Exception as e:
            logger.error(f"Error en búsqueda optimizada: {e}")
            # Fallback a búsqueda individual
            return self._buscar_lote_individual(
                codigos, documento_id, tipo_busqueda,
                fuzziness, incluir_contexto, resultado
            )
        
        return resultado
    
    # ========================================================================
    # BÚSQUEDA EN TEXTO COMPLETO
    # ========================================================================
    
    def buscar_en_texto(
        self,
        texto: str,
        documento_id: Optional[int] = None,
        limite: int = LIMITE_RESULTADOS_DEFAULT,
    ) -> List[Dict[str, Any]]:
        """
        Busca texto en el contenido de los manifiestos.
        
        Args:
            texto: Texto a buscar
            documento_id: Filtrar por documento
            limite: Máximo de resultados
            
        Returns:
            Lista de coincidencias con resaltado
        """
        if not self.disponible:
            return []
        
        return self.es.buscar_en_manifiesto(texto, documento_id, limite)
    
    # ========================================================================
    # HELPERS DE CONSTRUCCIÓN DE QUERIES
    # ========================================================================
    
    def _construir_query_exacta(
        self,
        codigo: str,
        documento_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Construye query para búsqueda exacta."""
        codigo_norm = self._normalizar_codigo(codigo)
        variaciones = self._generar_variaciones(codigo)
        
        should_clauses = []
        
        # Búsqueda exacta por keyword
        for var in variaciones:
            should_clauses.append({"term": {"codigo.keyword": var}})
        
        # Wildcard normalizado
        should_clauses.append({
            "wildcard": {
                "codigo.keyword": {
                    "value": f"*{codigo_norm}*",
                    "case_insensitive": True
                }
            }
        })
        
        # Match analizado
        should_clauses.append({
            "match": {"codigo": {"query": codigo, "operator": "and"}}
        })
        
        query = {
            "bool": {
                "should": should_clauses,
                "minimum_should_match": 1
            }
        }
        
        if documento_id:
            query["bool"]["filter"] = [{"term": {"documento_id": documento_id}}]
        
        return query
    
    def _construir_query_fuzzy(
        self,
        codigo: str,
        documento_id: Optional[int] = None,
        fuzziness: str = "AUTO",
    ) -> Dict[str, Any]:
        """Construye query para búsqueda fuzzy."""
        query = {
            "bool": {
                "should": [
                    {
                        "fuzzy": {
                            "codigo.keyword": {
                                "value": codigo.upper(),
                                "fuzziness": fuzziness,
                            }
                        }
                    },
                    {
                        "match": {
                            "codigo": {
                                "query": codigo,
                                "fuzziness": fuzziness,
                            }
                        }
                    },
                ],
                "minimum_should_match": 1,
            }
        }
        
        if documento_id:
            query["bool"]["filter"] = [{"term": {"documento_id": documento_id}}]
        
        return query
    
    # ========================================================================
    # PROCESAMIENTO DE RESULTADOS
    # ========================================================================
    
    def _procesar_hits(
        self,
        hits: List[Dict[str, Any]],
        codigo_buscado: str,
        tipo_busqueda: TipoBusqueda,
        incluir_contexto: bool,
    ) -> List[CoincidenciaCodigo]:
        """Procesa hits del servicio ES y los convierte en CoincidenciaCodigo."""
        coincidencias = []
        codigo_norm = self._normalizar_codigo(codigo_buscado)
        
        for hit in hits:
            codigo_encontrado = hit.get("codigo", "")
            codigo_encontrado_norm = self._normalizar_codigo(codigo_encontrado)
            
            # Calcular similitud
            similitud = self._calcular_similitud(codigo_norm, codigo_encontrado_norm)
            es_exacto = codigo_norm == codigo_encontrado_norm
            
            # Construir ubicación
            ubicacion = UbicacionCodigo(
                pagina=hit.get("pagina", 1),
                linea=hit.get("linea", 0),
                columna=hit.get("columna", 0),
                posicion_inicio=hit.get("posicion_inicio", 0),
                posicion_fin=hit.get("posicion_fin", 0),
            )
            
            # Construir contexto
            contexto = ContextoCodigo()
            if incluir_contexto:
                contexto.texto = hit.get("contexto", "")
                contexto.texto_antes = hit.get("contexto_antes", "")
                contexto.texto_despues = hit.get("contexto_despues", "")
                contexto.resaltado = self._resaltar_codigo(
                    contexto.texto, codigo_encontrado
                )
            
            coincidencia = CoincidenciaCodigo(
                codigo_buscado=codigo_buscado,
                codigo_encontrado=codigo_encontrado,
                codigo_normalizado=codigo_encontrado_norm,
                documento_id=hit.get("documento_id", 0),
                nombre_documento=hit.get("nombre_documento", ""),
                tipo_codigo=hit.get("tipo_codigo", "desconocido"),
                ubicacion=ubicacion,
                contexto=contexto,
                score=hit.get("_score", 0.0),
                tipo_busqueda=tipo_busqueda,
                es_exacto=es_exacto,
                similitud=similitud,
            )
            
            coincidencias.append(coincidencia)
        
        # Ordenar por score descendente
        coincidencias.sort(key=lambda c: c.score, reverse=True)
        
        return coincidencias
    
    def _procesar_hits_raw(
        self,
        hits: List[Dict[str, Any]],
        codigo_buscado: str,
        tipo_busqueda: TipoBusqueda,
        incluir_contexto: bool,
    ) -> List[CoincidenciaCodigo]:
        """Procesa hits raw de ES (formato _source)."""
        coincidencias = []
        codigo_norm = self._normalizar_codigo(codigo_buscado)
        
        for hit in hits:
            source = hit.get("_source", {})
            score = hit.get("_score", 0.0)
            
            codigo_encontrado = source.get("codigo", "")
            codigo_encontrado_norm = self._normalizar_codigo(codigo_encontrado)
            
            similitud = self._calcular_similitud(codigo_norm, codigo_encontrado_norm)
            es_exacto = codigo_norm == codigo_encontrado_norm
            
            ubicacion = UbicacionCodigo(
                pagina=source.get("pagina", 1),
                linea=source.get("linea", 0),
                columna=source.get("columna", 0),
                posicion_inicio=source.get("posicion_inicio", 0),
                posicion_fin=source.get("posicion_fin", 0),
            )
            
            contexto = ContextoCodigo()
            if incluir_contexto:
                contexto.texto = source.get("contexto", "")
                contexto.texto_antes = source.get("contexto_antes", "")
                contexto.texto_despues = source.get("contexto_despues", "")
                contexto.resaltado = self._resaltar_codigo(
                    contexto.texto, codigo_encontrado
                )
            
            coincidencia = CoincidenciaCodigo(
                codigo_buscado=codigo_buscado,
                codigo_encontrado=codigo_encontrado,
                codigo_normalizado=codigo_encontrado_norm,
                documento_id=source.get("documento_id", 0),
                nombre_documento=source.get("nombre_documento", ""),
                tipo_codigo=source.get("tipo_codigo", "desconocido"),
                ubicacion=ubicacion,
                contexto=contexto,
                score=score,
                tipo_busqueda=tipo_busqueda,
                es_exacto=es_exacto,
                similitud=similitud,
            )
            
            coincidencias.append(coincidencia)
        
        coincidencias.sort(key=lambda c: c.score, reverse=True)
        return coincidencias
    
    # ========================================================================
    # UTILIDADES
    # ========================================================================
    
    def _normalizar_codigo(self, codigo: str) -> str:
        """Normaliza un código para comparación."""
        return (
            codigo
            .upper()
            .replace(" ", "")
            .replace("-", "")
            .replace("_", "")
            .replace(".", "")
            .replace("/", "")
        )
    
    def _generar_variaciones(self, codigo: str) -> List[str]:
        """Genera variaciones de un código para búsqueda."""
        variaciones = set()
        codigo_upper = codigo.upper()
        codigo_lower = codigo.lower()
        codigo_norm = self._normalizar_codigo(codigo)
        
        variaciones.add(codigo)
        variaciones.add(codigo_upper)
        variaciones.add(codigo_lower)
        variaciones.add(codigo_norm)
        variaciones.add(codigo_norm.lower())
        
        # Variaciones con separadores
        separadores = ["-", "_", " "]
        for sep in separadores:
            var = self._insertar_separadores(codigo_norm, sep)
            if var != codigo_norm:
                variaciones.add(var)
                variaciones.add(var.upper())
        
        return list(variaciones)
    
    def _insertar_separadores(self, codigo: str, sep: str) -> str:
        """Inserta separadores en transiciones letra-número."""
        if not codigo:
            return codigo
        
        resultado = [codigo[0]]
        for i in range(1, len(codigo)):
            actual = codigo[i]
            anterior = codigo[i - 1]
            
            if (anterior.isalpha() and actual.isdigit()) or \
               (anterior.isdigit() and actual.isalpha()):
                resultado.append(sep)
            
            resultado.append(actual)
        
        return "".join(resultado)
    
    def _calcular_similitud(self, s1: str, s2: str) -> float:
        """
        Calcula similitud entre dos strings (Levenshtein normalizado).
        
        Returns:
            Float entre 0 y 1 (1 = idénticos)
        """
        if s1 == s2:
            return 1.0
        
        if not s1 or not s2:
            return 0.0
        
        # Usar distancia de Levenshtein simple
        len1, len2 = len(s1), len(s2)
        max_len = max(len1, len2)
        
        # Matriz de distancia
        dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]
        
        for i in range(len1 + 1):
            dp[i][0] = i
        for j in range(len2 + 1):
            dp[0][j] = j
        
        for i in range(1, len1 + 1):
            for j in range(1, len2 + 1):
                cost = 0 if s1[i-1] == s2[j-1] else 1
                dp[i][j] = min(
                    dp[i-1][j] + 1,      # Eliminación
                    dp[i][j-1] + 1,      # Inserción
                    dp[i-1][j-1] + cost  # Sustitución
                )
        
        distancia = dp[len1][len2]
        similitud = 1.0 - (distancia / max_len)
        
        return max(0.0, min(1.0, similitud))
    
    def _resaltar_codigo(self, texto: str, codigo: str) -> str:
        """Resalta un código en el texto con marcas HTML."""
        if not texto or not codigo:
            return texto
        
        # Buscar el código (case insensitive)
        import re
        patron = re.escape(codigo)
        return re.sub(
            patron,
            f"<mark>{codigo}</mark>",
            texto,
            flags=re.IGNORECASE
        )
    
    def _actualizar_stats(
        self,
        tipo: TipoBusqueda,
        resultado: ResultadoBusquedaCodigo,
    ) -> None:
        """Actualiza estadísticas internas."""
        self._stats.total_busquedas += 1
        self._stats.codigos_unicos_buscados += 1
        self._stats.coincidencias_totales += resultado.total_coincidencias
        self._stats.tiempo_total_ms += resultado.tiempo_busqueda_ms
        
        tipo_str = tipo.value
        self._stats.busquedas_por_tipo[tipo_str] = (
            self._stats.busquedas_por_tipo.get(tipo_str, 0) + 1
        )
    
    def obtener_estadisticas(self) -> EstadisticasBusqueda:
        """Retorna estadísticas de la sesión de búsqueda."""
        return self._stats
    
    def reiniciar_estadisticas(self) -> None:
        """Reinicia las estadísticas."""
        self._stats = EstadisticasBusqueda()


# ============================================================================
# INSTANCIA GLOBAL
# ============================================================================

_busqueda_service: Optional[BusquedaService] = None


def get_busqueda_service() -> Optional[BusquedaService]:
    """Obtiene la instancia global del servicio de búsqueda."""
    global _busqueda_service
    
    if not ELASTICSEARCH_DISPONIBLE:
        return None
    
    if _busqueda_service is None:
        try:
            _busqueda_service = BusquedaService()
        except Exception as e:
            logger.warning(f"No se pudo inicializar BusquedaService: {e}")
            return None
    
    return _busqueda_service

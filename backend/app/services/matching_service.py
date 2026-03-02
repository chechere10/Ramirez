"""
Servicio de Matching para ManifestoCross.
Fase 4.4 - Algoritmo de comparación de códigos entre facturas y manifiestos.

Proporciona:
- Comparación de códigos de factura vs manifiesto
- Clasificación: encontrados / no encontrados / parciales
- Detección de coincidencias parciales (fuzzy)
- Generación de estadísticas de matching
- Manejo de códigos normalizados
"""

import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from loguru import logger

from app.services.busqueda_service import (
    BusquedaService,
    CoincidenciaCodigo,
    EstadoCoincidencia,
    ResultadoBusquedaCodigo,
    ResultadoBusquedaLote,
    TipoBusqueda,
    get_busqueda_service,
)


# ============================================================================
# ENUMS Y CONSTANTES
# ============================================================================

class EstadoMatch(str, Enum):
    """Estado de coincidencia de un código."""
    
    ENCONTRADO = "encontrado"          # Coincidencia exacta
    NO_ENCONTRADO = "no_encontrado"    # Sin coincidencia
    PARCIAL = "parcial"                # Coincidencia fuzzy/aproximada
    MULTIPLE = "multiple"              # Encontrado en múltiples lugares
    DUPLICADO = "duplicado"            # Código duplicado en factura


class TipoMatch(str, Enum):
    """Tipo de matching realizado."""
    
    EXACTO = "exacto"
    NORMALIZADO = "normalizado"
    FUZZY = "fuzzy"
    COMBINADO = "combinado"


# ============================================================================
# DATACLASSES DE RESULTADOS
# ============================================================================

@dataclass
class CodigoNormalizado:
    """Representa un código con su versión original y normalizada."""
    
    original: str
    normalizado: str
    
    # Metadatos del origen
    linea_origen: Optional[int] = None
    columna_origen: Optional[str] = None
    origen: str = "factura"


@dataclass
class DetalleMatch:
    """Detalle de una coincidencia encontrada."""
    
    codigo_factura: str
    codigo_manifiesto: str
    codigo_normalizado: str
    
    estado: EstadoMatch
    tipo_match: TipoMatch
    similitud: float = 1.0  # 0-1
    
    # Ubicación en manifiesto
    documento_id: int = 0
    nombre_documento: str = ""
    pagina: int = 0
    linea: int = 0
    
    # Contexto
    contexto: str = ""
    
    # Score de relevancia
    score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "codigo_factura": self.codigo_factura,
            "codigo_manifiesto": self.codigo_manifiesto,
            "codigo_normalizado": self.codigo_normalizado,
            "estado": self.estado.value,
            "tipo_match": self.tipo_match.value,
            "similitud": round(self.similitud, 4),
            "ubicacion": {
                "documento_id": self.documento_id,
                "nombre_documento": self.nombre_documento,
                "pagina": self.pagina,
                "linea": self.linea,
            },
            "contexto": self.contexto,
            "score": round(self.score, 4),
        }


@dataclass
class ResultadoCodigoMatch:
    """Resultado de matching para un código específico."""
    
    codigo_original: str
    codigo_normalizado: str
    estado: EstadoMatch
    
    # Coincidencias encontradas
    coincidencias: List[DetalleMatch] = field(default_factory=list)
    total_coincidencias: int = 0
    
    # Mejor coincidencia (si existe)
    mejor_coincidencia: Optional[DetalleMatch] = None
    
    # Metadatos
    es_duplicado: bool = False
    indice_original: int = 0  # Posición en lista original
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "codigo_original": self.codigo_original,
            "codigo_normalizado": self.codigo_normalizado,
            "estado": self.estado.value,
            "total_coincidencias": self.total_coincidencias,
            "mejor_coincidencia": (
                self.mejor_coincidencia.to_dict() 
                if self.mejor_coincidencia else None
            ),
            "es_duplicado": self.es_duplicado,
            "coincidencias": [c.to_dict() for c in self.coincidencias],
        }


@dataclass
class EstadisticasMatch:
    """Estadísticas completas del proceso de matching."""
    
    # Totales
    total_codigos_factura: int = 0
    total_codigos_unicos: int = 0
    total_duplicados_factura: int = 0
    
    # Resultados
    total_encontrados: int = 0
    total_no_encontrados: int = 0
    total_parciales: int = 0
    total_multiples: int = 0
    
    # Porcentajes
    porcentaje_encontrados: float = 0.0
    porcentaje_no_encontrados: float = 0.0
    porcentaje_parciales: float = 0.0
    porcentaje_cobertura: float = 0.0  # Encontrados + Parciales
    
    # Por tipo de match
    matches_exactos: int = 0
    matches_normalizados: int = 0
    matches_fuzzy: int = 0
    
    # Documentos
    documentos_consultados: int = 0
    paginas_con_coincidencias: Set[int] = field(default_factory=set)
    
    # Performance
    tiempo_total_ms: int = 0
    tiempo_promedio_por_codigo_ms: float = 0.0
    
    def calcular_porcentajes(self) -> None:
        """Calcula los porcentajes basados en totales."""
        if self.total_codigos_unicos > 0:
            self.porcentaje_encontrados = (
                self.total_encontrados / self.total_codigos_unicos * 100
            )
            self.porcentaje_no_encontrados = (
                self.total_no_encontrados / self.total_codigos_unicos * 100
            )
            self.porcentaje_parciales = (
                self.total_parciales / self.total_codigos_unicos * 100
            )
            self.porcentaje_cobertura = (
                (self.total_encontrados + self.total_parciales) 
                / self.total_codigos_unicos * 100
            )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "totales": {
                "codigos_factura": self.total_codigos_factura,
                "codigos_unicos": self.total_codigos_unicos,
                "duplicados_factura": self.total_duplicados_factura,
            },
            "resultados": {
                "encontrados": self.total_encontrados,
                "no_encontrados": self.total_no_encontrados,
                "parciales": self.total_parciales,
                "multiples": self.total_multiples,
            },
            "porcentajes": {
                "encontrados": round(self.porcentaje_encontrados, 2),
                "no_encontrados": round(self.porcentaje_no_encontrados, 2),
                "parciales": round(self.porcentaje_parciales, 2),
                "cobertura_total": round(self.porcentaje_cobertura, 2),
            },
            "por_tipo_match": {
                "exactos": self.matches_exactos,
                "normalizados": self.matches_normalizados,
                "fuzzy": self.matches_fuzzy,
            },
            "performance": {
                "tiempo_total_ms": self.tiempo_total_ms,
                "tiempo_promedio_ms": round(self.tiempo_promedio_por_codigo_ms, 2),
            },
        }


@dataclass
class ResultadoMatching:
    """Resultado completo del proceso de matching."""
    
    # Identificadores
    factura_id: Optional[int] = None
    manifiesto_id: Optional[int] = None
    nombre_factura: str = ""
    nombre_manifiesto: str = ""
    
    # Configuración usada
    tipo_match: TipoMatch = TipoMatch.COMBINADO
    umbral_similitud: float = 0.8
    incluir_contexto: bool = True
    
    # Resultados por código
    resultados: List[ResultadoCodigoMatch] = field(default_factory=list)
    
    # Listas clasificadas
    encontrados: List[str] = field(default_factory=list)
    no_encontrados: List[str] = field(default_factory=list)
    parciales: List[str] = field(default_factory=list)
    duplicados: List[str] = field(default_factory=list)
    
    # Estadísticas
    estadisticas: EstadisticasMatch = field(default_factory=EstadisticasMatch)
    
    # Metadatos
    fecha_matching: datetime = field(default_factory=datetime.now)
    exito: bool = True
    errores: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "identificadores": {
                "factura_id": self.factura_id,
                "manifiesto_id": self.manifiesto_id,
                "nombre_factura": self.nombre_factura,
                "nombre_manifiesto": self.nombre_manifiesto,
            },
            "configuracion": {
                "tipo_match": self.tipo_match.value,
                "umbral_similitud": self.umbral_similitud,
                "incluir_contexto": self.incluir_contexto,
            },
            "listas": {
                "encontrados": self.encontrados,
                "no_encontrados": self.no_encontrados,
                "parciales": self.parciales,
                "duplicados": self.duplicados,
            },
            "estadisticas": self.estadisticas.to_dict(),
            "metadatos": {
                "fecha_matching": self.fecha_matching.isoformat(),
                "exito": self.exito,
                "errores": self.errores,
            },
            "resultados": [r.to_dict() for r in self.resultados],
        }
    
    def to_resumen(self) -> Dict[str, Any]:
        """Retorna solo el resumen sin los detalles de cada código."""
        return {
            "identificadores": {
                "factura_id": self.factura_id,
                "manifiesto_id": self.manifiesto_id,
                "nombre_factura": self.nombre_factura,
                "nombre_manifiesto": self.nombre_manifiesto,
            },
            "listas": {
                "encontrados": self.encontrados,
                "no_encontrados": self.no_encontrados,
                "parciales": self.parciales,
                "duplicados": self.duplicados,
            },
            "estadisticas": self.estadisticas.to_dict(),
            "fecha_matching": self.fecha_matching.isoformat(),
            "exito": self.exito,
        }


# ============================================================================
# SERVICIO DE MATCHING
# ============================================================================

class MatchingService:
    """
    Servicio de Matching para comparar códigos de factura contra manifiestos.
    
    Proporciona:
    - Comparación exacta de códigos
    - Comparación con normalización
    - Comparación fuzzy (tolerante a errores)
    - Comparación combinada (todas las anteriores)
    - Estadísticas detalladas del proceso
    """
    
    # Configuración por defecto
    UMBRAL_SIMILITUD_DEFAULT = 0.8
    FUZZINESS_DEFAULT = "AUTO"
    
    def __init__(
        self,
        busqueda_service: Optional[BusquedaService] = None,
    ):
        """
        Inicializa el servicio de matching.
        
        Args:
            busqueda_service: Servicio de búsqueda (usa global si no se provee)
        """
        self.busqueda = busqueda_service or get_busqueda_service()
        
        if not self.busqueda:
            logger.warning("BusquedaService no disponible - matching deshabilitado")
        
        logger.info("MatchingService inicializado")
    
    @property
    def disponible(self) -> bool:
        """Indica si el servicio está disponible."""
        return self.busqueda is not None and self.busqueda.disponible
    
    # ========================================================================
    # MÉTODOS PRINCIPALES DE MATCHING
    # ========================================================================
    
    def ejecutar_matching(
        self,
        codigos_factura: List[str],
        manifiesto_id: Optional[int] = None,
        tipo_match: TipoMatch = TipoMatch.COMBINADO,
        umbral_similitud: float = UMBRAL_SIMILITUD_DEFAULT,
        incluir_contexto: bool = True,
        nombre_factura: str = "",
        nombre_manifiesto: str = "",
    ) -> ResultadoMatching:
        """
        Ejecuta el proceso de matching entre códigos de factura y manifiesto.
        
        Args:
            codigos_factura: Lista de códigos a buscar
            manifiesto_id: ID del manifiesto (None para buscar en todos)
            tipo_match: Tipo de matching a realizar
            umbral_similitud: Umbral mínimo para coincidencias parciales
            incluir_contexto: Si incluir contexto textual
            nombre_factura: Nombre descriptivo de la factura
            nombre_manifiesto: Nombre descriptivo del manifiesto
            
        Returns:
            ResultadoMatching con todos los resultados y estadísticas
        """
        inicio = time.time()
        
        resultado = ResultadoMatching(
            manifiesto_id=manifiesto_id,
            nombre_factura=nombre_factura,
            nombre_manifiesto=nombre_manifiesto,
            tipo_match=tipo_match,
            umbral_similitud=umbral_similitud,
            incluir_contexto=incluir_contexto,
        )
        
        if not self.disponible:
            resultado.exito = False
            resultado.errores.append("Servicio de búsqueda no disponible")
            logger.error("MatchingService no disponible")
            return resultado
        
        if not codigos_factura:
            resultado.exito = True
            return resultado
        
        try:
            # 1. Preparar y normalizar códigos
            codigos_preparados, duplicados = self._preparar_codigos(codigos_factura)
            resultado.duplicados = duplicados
            
            # 2. Ejecutar matching según tipo
            if tipo_match == TipoMatch.EXACTO:
                resultados_match = self._matching_exacto(
                    codigos_preparados, manifiesto_id, incluir_contexto
                )
            elif tipo_match == TipoMatch.NORMALIZADO:
                resultados_match = self._matching_normalizado(
                    codigos_preparados, manifiesto_id, incluir_contexto
                )
            elif tipo_match == TipoMatch.FUZZY:
                resultados_match = self._matching_fuzzy(
                    codigos_preparados, manifiesto_id, 
                    umbral_similitud, incluir_contexto
                )
            else:  # COMBINADO
                resultados_match = self._matching_combinado(
                    codigos_preparados, manifiesto_id,
                    umbral_similitud, incluir_contexto
                )
            
            # 3. Procesar resultados
            resultado.resultados = resultados_match
            
            # 4. Clasificar códigos
            for res in resultados_match:
                if res.estado == EstadoMatch.ENCONTRADO:
                    resultado.encontrados.append(res.codigo_original)
                elif res.estado == EstadoMatch.PARCIAL:
                    resultado.parciales.append(res.codigo_original)
                elif res.estado == EstadoMatch.MULTIPLE:
                    resultado.encontrados.append(res.codigo_original)
                else:
                    resultado.no_encontrados.append(res.codigo_original)
            
            # 5. Calcular estadísticas
            resultado.estadisticas = self._calcular_estadisticas(
                codigos_factura, codigos_preparados, resultados_match, duplicados
            )
            
            resultado.exito = True
            
        except Exception as e:
            logger.error(f"Error en matching: {e}")
            resultado.exito = False
            resultado.errores.append(str(e))
        
        resultado.estadisticas.tiempo_total_ms = int((time.time() - inicio) * 1000)
        if codigos_factura:
            resultado.estadisticas.tiempo_promedio_por_codigo_ms = (
                resultado.estadisticas.tiempo_total_ms / len(codigos_factura)
            )
        
        logger.info(
            f"Matching completado: {resultado.estadisticas.total_encontrados}/"
            f"{resultado.estadisticas.total_codigos_unicos} encontrados "
            f"({resultado.estadisticas.porcentaje_encontrados:.1f}%) "
            f"en {resultado.estadisticas.tiempo_total_ms}ms"
        )
        
        return resultado
    
    # ========================================================================
    # MÉTODOS DE MATCHING POR TIPO
    # ========================================================================
    
    def _matching_exacto(
        self,
        codigos: List[CodigoNormalizado],
        manifiesto_id: Optional[int],
        incluir_contexto: bool,
    ) -> List[ResultadoCodigoMatch]:
        """Matching solo con coincidencia exacta."""
        resultados = []
        
        # Usar búsqueda por lotes para eficiencia
        codigos_str = [c.original for c in codigos]
        resultado_lote = self.busqueda.buscar_lote(
            codigos_str,
            documento_id=manifiesto_id,
            tipo_busqueda=TipoBusqueda.EXACTA,
            incluir_contexto=incluir_contexto,
            usar_optimizacion=True,
        )
        
        for i, codigo in enumerate(codigos):
            res_busqueda = resultado_lote.resultados.get(codigo.original)
            resultado = self._procesar_resultado_busqueda(
                codigo, res_busqueda, TipoMatch.EXACTO, i
            )
            resultados.append(resultado)
        
        return resultados
    
    def _matching_normalizado(
        self,
        codigos: List[CodigoNormalizado],
        manifiesto_id: Optional[int],
        incluir_contexto: bool,
    ) -> List[ResultadoCodigoMatch]:
        """Matching usando códigos normalizados."""
        resultados = []
        
        # Buscar por código normalizado
        codigos_norm = [c.normalizado for c in codigos]
        resultado_lote = self.busqueda.buscar_lote(
            codigos_norm,
            documento_id=manifiesto_id,
            tipo_busqueda=TipoBusqueda.EXACTA,
            incluir_contexto=incluir_contexto,
            usar_optimizacion=True,
        )
        
        for i, codigo in enumerate(codigos):
            res_busqueda = resultado_lote.resultados.get(codigo.normalizado)
            resultado = self._procesar_resultado_busqueda(
                codigo, res_busqueda, TipoMatch.NORMALIZADO, i
            )
            resultados.append(resultado)
        
        return resultados
    
    def _matching_fuzzy(
        self,
        codigos: List[CodigoNormalizado],
        manifiesto_id: Optional[int],
        umbral_similitud: float,
        incluir_contexto: bool,
    ) -> List[ResultadoCodigoMatch]:
        """Matching con tolerancia a errores (fuzzy)."""
        resultados = []
        
        # Búsqueda fuzzy por lotes
        codigos_str = [c.original for c in codigos]
        resultado_lote = self.busqueda.buscar_lote(
            codigos_str,
            documento_id=manifiesto_id,
            tipo_busqueda=TipoBusqueda.FUZZY,
            incluir_contexto=incluir_contexto,
            usar_optimizacion=True,
        )
        
        for i, codigo in enumerate(codigos):
            res_busqueda = resultado_lote.resultados.get(codigo.original)
            resultado = self._procesar_resultado_busqueda(
                codigo, res_busqueda, TipoMatch.FUZZY, i, umbral_similitud
            )
            resultados.append(resultado)
        
        return resultados
    
    def _matching_combinado(
        self,
        codigos: List[CodigoNormalizado],
        manifiesto_id: Optional[int],
        umbral_similitud: float,
        incluir_contexto: bool,
    ) -> List[ResultadoCodigoMatch]:
        """
        Matching combinado: primero exacto, luego normalizado, luego fuzzy.
        
        Estrategia:
        1. Búsqueda exacta para todos
        2. Para no encontrados, búsqueda normalizada
        3. Para aún no encontrados, búsqueda fuzzy
        """
        resultados_final: Dict[str, ResultadoCodigoMatch] = {}
        codigos_pendientes = codigos.copy()
        
        # Paso 1: Búsqueda exacta
        logger.debug(f"Matching combinado - Paso 1: Exacto ({len(codigos_pendientes)} códigos)")
        resultados_exacto = self._matching_exacto(
            codigos_pendientes, manifiesto_id, incluir_contexto
        )
        
        codigos_pendientes = []
        for i, res in enumerate(resultados_exacto):
            if res.estado in (EstadoMatch.ENCONTRADO, EstadoMatch.MULTIPLE):
                resultados_final[res.codigo_original] = res
            else:
                codigos_pendientes.append(codigos[i])
        
        # Paso 2: Búsqueda normalizada para pendientes
        if codigos_pendientes:
            logger.debug(f"Matching combinado - Paso 2: Normalizado ({len(codigos_pendientes)} códigos)")
            resultados_norm = self._matching_normalizado(
                codigos_pendientes, manifiesto_id, incluir_contexto
            )
            
            nuevos_pendientes = []
            for i, res in enumerate(resultados_norm):
                if res.estado in (EstadoMatch.ENCONTRADO, EstadoMatch.MULTIPLE):
                    res.estado = EstadoMatch.ENCONTRADO  # Marcar como encontrado
                    for coinc in res.coincidencias:
                        coinc.tipo_match = TipoMatch.NORMALIZADO
                    resultados_final[res.codigo_original] = res
                else:
                    nuevos_pendientes.append(codigos_pendientes[i])
            
            codigos_pendientes = nuevos_pendientes
        
        # Paso 3: Búsqueda fuzzy para pendientes
        if codigos_pendientes:
            logger.debug(f"Matching combinado - Paso 3: Fuzzy ({len(codigos_pendientes)} códigos)")
            resultados_fuzzy = self._matching_fuzzy(
                codigos_pendientes, manifiesto_id, umbral_similitud, incluir_contexto
            )
            
            for res in resultados_fuzzy:
                if res.estado == EstadoMatch.PARCIAL:
                    for coinc in res.coincidencias:
                        coinc.tipo_match = TipoMatch.FUZZY
                resultados_final[res.codigo_original] = res
        
        # Reconstruir lista ordenada
        resultados = []
        for i, codigo in enumerate(codigos):
            if codigo.original in resultados_final:
                res = resultados_final[codigo.original]
                res.indice_original = i
                resultados.append(res)
        
        return resultados
    
    # ========================================================================
    # MÉTODOS AUXILIARES
    # ========================================================================
    
    def _preparar_codigos(
        self,
        codigos: List[str],
    ) -> Tuple[List[CodigoNormalizado], List[str]]:
        """
        Prepara y normaliza la lista de códigos, detectando duplicados.
        
        Returns:
            Tupla de (códigos únicos normalizados, lista de duplicados)
        """
        vistos: Set[str] = set()
        duplicados: List[str] = []
        codigos_unicos: List[CodigoNormalizado] = []
        
        for codigo_raw in codigos:
            codigo = codigo_raw.strip()
            if not codigo:
                continue
            
            normalizado = self._normalizar_codigo(codigo)
            
            if normalizado in vistos:
                duplicados.append(codigo)
                continue
            
            vistos.add(normalizado)
            codigos_unicos.append(CodigoNormalizado(
                original=codigo,
                normalizado=normalizado,
            ))
        
        return codigos_unicos, duplicados
    
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
    
    def _procesar_resultado_busqueda(
        self,
        codigo: CodigoNormalizado,
        resultado_busqueda: Optional[ResultadoBusquedaCodigo],
        tipo_match: TipoMatch,
        indice: int,
        umbral_similitud: float = 0.8,
    ) -> ResultadoCodigoMatch:
        """Procesa el resultado de búsqueda y lo convierte en ResultadoCodigoMatch."""
        resultado = ResultadoCodigoMatch(
            codigo_original=codigo.original,
            codigo_normalizado=codigo.normalizado,
            estado=EstadoMatch.NO_ENCONTRADO,
            indice_original=indice,
        )
        
        if not resultado_busqueda or not resultado_busqueda.coincidencias:
            return resultado
        
        # Procesar coincidencias
        for coinc in resultado_busqueda.coincidencias:
            # Filtrar por umbral de similitud para fuzzy
            if tipo_match == TipoMatch.FUZZY and coinc.similitud < umbral_similitud:
                continue
            
            detalle = DetalleMatch(
                codigo_factura=codigo.original,
                codigo_manifiesto=coinc.codigo_encontrado,
                codigo_normalizado=coinc.codigo_normalizado,
                estado=EstadoMatch.ENCONTRADO if coinc.es_exacto else EstadoMatch.PARCIAL,
                tipo_match=tipo_match,
                similitud=coinc.similitud,
                documento_id=coinc.documento_id,
                nombre_documento=coinc.nombre_documento,
                pagina=coinc.ubicacion.pagina,
                linea=coinc.ubicacion.linea,
                contexto=coinc.contexto.texto,
                score=coinc.score,
            )
            resultado.coincidencias.append(detalle)
        
        if resultado.coincidencias:
            resultado.total_coincidencias = len(resultado.coincidencias)
            
            # Determinar estado
            tiene_exacta = any(
                c.similitud >= 0.99 for c in resultado.coincidencias
            )
            
            if tiene_exacta:
                if resultado.total_coincidencias > 1:
                    resultado.estado = EstadoMatch.MULTIPLE
                else:
                    resultado.estado = EstadoMatch.ENCONTRADO
            else:
                resultado.estado = EstadoMatch.PARCIAL
            
            # Mejor coincidencia (mayor score)
            resultado.mejor_coincidencia = max(
                resultado.coincidencias, key=lambda c: c.score
            )
        
        return resultado
    
    def _calcular_estadisticas(
        self,
        codigos_originales: List[str],
        codigos_unicos: List[CodigoNormalizado],
        resultados: List[ResultadoCodigoMatch],
        duplicados: List[str],
    ) -> EstadisticasMatch:
        """Calcula estadísticas del proceso de matching."""
        stats = EstadisticasMatch(
            total_codigos_factura=len(codigos_originales),
            total_codigos_unicos=len(codigos_unicos),
            total_duplicados_factura=len(duplicados),
        )
        
        documentos: Set[int] = set()
        paginas: Set[int] = set()
        
        for res in resultados:
            if res.estado == EstadoMatch.ENCONTRADO:
                stats.total_encontrados += 1
            elif res.estado == EstadoMatch.MULTIPLE:
                stats.total_encontrados += 1
                stats.total_multiples += 1
            elif res.estado == EstadoMatch.PARCIAL:
                stats.total_parciales += 1
            else:
                stats.total_no_encontrados += 1
            
            # Contar por tipo de match
            if res.mejor_coincidencia:
                if res.mejor_coincidencia.tipo_match == TipoMatch.EXACTO:
                    stats.matches_exactos += 1
                elif res.mejor_coincidencia.tipo_match == TipoMatch.NORMALIZADO:
                    stats.matches_normalizados += 1
                elif res.mejor_coincidencia.tipo_match == TipoMatch.FUZZY:
                    stats.matches_fuzzy += 1
                
                documentos.add(res.mejor_coincidencia.documento_id)
                paginas.add(res.mejor_coincidencia.pagina)
        
        stats.documentos_consultados = len(documentos)
        stats.paginas_con_coincidencias = paginas
        stats.calcular_porcentajes()
        
        return stats
    
    # ========================================================================
    # MÉTODOS DE UTILIDAD
    # ========================================================================
    
    def comparar_listas(
        self,
        codigos_factura: List[str],
        codigos_manifiesto: List[str],
    ) -> ResultadoMatching:
        """
        Compara dos listas de códigos directamente (sin ElasticSearch).
        
        Útil para comparaciones rápidas sin necesidad de indexación.
        """
        inicio = time.time()
        
        resultado = ResultadoMatching(tipo_match=TipoMatch.COMBINADO)
        
        # Normalizar códigos del manifiesto
        codigos_manif_norm = {
            self._normalizar_codigo(c): c for c in codigos_manifiesto
        }
        
        # Preparar códigos de factura
        codigos_fact, duplicados = self._preparar_codigos(codigos_factura)
        resultado.duplicados = duplicados
        
        for i, codigo in enumerate(codigos_fact):
            res_codigo = ResultadoCodigoMatch(
                codigo_original=codigo.original,
                codigo_normalizado=codigo.normalizado,
                estado=EstadoMatch.NO_ENCONTRADO,
                indice_original=i,
            )
            
            # Buscar coincidencia exacta normalizada
            if codigo.normalizado in codigos_manif_norm:
                codigo_manif = codigos_manif_norm[codigo.normalizado]
                detalle = DetalleMatch(
                    codigo_factura=codigo.original,
                    codigo_manifiesto=codigo_manif,
                    codigo_normalizado=codigo.normalizado,
                    estado=EstadoMatch.ENCONTRADO,
                    tipo_match=TipoMatch.NORMALIZADO,
                    similitud=1.0,
                )
                res_codigo.coincidencias.append(detalle)
                res_codigo.mejor_coincidencia = detalle
                res_codigo.total_coincidencias = 1
                res_codigo.estado = EstadoMatch.ENCONTRADO
                resultado.encontrados.append(codigo.original)
            else:
                # Buscar coincidencia fuzzy
                mejor_similitud = 0.0
                mejor_codigo = None
                
                for cod_norm, cod_orig in codigos_manif_norm.items():
                    similitud = self._calcular_similitud(
                        codigo.normalizado, cod_norm
                    )
                    if similitud > mejor_similitud and similitud >= 0.8:
                        mejor_similitud = similitud
                        mejor_codigo = cod_orig
                
                if mejor_codigo:
                    detalle = DetalleMatch(
                        codigo_factura=codigo.original,
                        codigo_manifiesto=mejor_codigo,
                        codigo_normalizado=self._normalizar_codigo(mejor_codigo),
                        estado=EstadoMatch.PARCIAL,
                        tipo_match=TipoMatch.FUZZY,
                        similitud=mejor_similitud,
                    )
                    res_codigo.coincidencias.append(detalle)
                    res_codigo.mejor_coincidencia = detalle
                    res_codigo.total_coincidencias = 1
                    res_codigo.estado = EstadoMatch.PARCIAL
                    resultado.parciales.append(codigo.original)
                else:
                    resultado.no_encontrados.append(codigo.original)
            
            resultado.resultados.append(res_codigo)
        
        # Calcular estadísticas
        resultado.estadisticas = self._calcular_estadisticas(
            codigos_factura, codigos_fact, resultado.resultados, duplicados
        )
        resultado.estadisticas.tiempo_total_ms = int((time.time() - inicio) * 1000)
        
        return resultado
    
    def _calcular_similitud(self, s1: str, s2: str) -> float:
        """Calcula similitud entre dos strings (Levenshtein normalizado)."""
        if s1 == s2:
            return 1.0
        
        if not s1 or not s2:
            return 0.0
        
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
                    dp[i-1][j] + 1,
                    dp[i][j-1] + 1,
                    dp[i-1][j-1] + cost
                )
        
        distancia = dp[len1][len2]
        return max(0.0, 1.0 - (distancia / max_len))


# ============================================================================
# INSTANCIA GLOBAL
# ============================================================================

_matching_service: Optional[MatchingService] = None


def get_matching_service() -> Optional[MatchingService]:
    """Obtiene la instancia global del servicio de matching."""
    global _matching_service
    
    if _matching_service is None:
        try:
            _matching_service = MatchingService()
        except Exception as e:
            logger.warning(f"No se pudo inicializar MatchingService: {e}")
            return None
    
    return _matching_service

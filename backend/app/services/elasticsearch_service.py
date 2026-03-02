"""
Servicio de ElasticSearch para ManifestoCross.
Fase 4.1 - Gestión de índices, indexación y búsqueda.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger

from app.core.config import settings
from app.services.elasticsearch_config import (
    INDICES_CONFIG,
    get_all_index_names,
)

try:
    from elasticsearch import Elasticsearch, NotFoundError
    from elasticsearch.helpers import bulk
    ELASTICSEARCH_DISPONIBLE = True
except ImportError:
    ELASTICSEARCH_DISPONIBLE = False
    logger.warning("elasticsearch-py no está instalado")


class ElasticSearchService:
    """
    Servicio completo de ElasticSearch para ManifestoCross.
    
    Proporciona:
    - Gestión de conexión y healthcheck
    - Creación y gestión de índices
    - Indexación de documentos, códigos y facturas
    - Búsqueda exacta, fuzzy y por lotes
    - Utilidades de mantenimiento
    """
    
    def __init__(
        self,
        url: Optional[str] = None,
        index_prefix: str = "manifiestos",
        timeout: int = 30,
    ):
        """
        Inicializa el servicio de ElasticSearch.
        
        Args:
            url: URL de ElasticSearch
            index_prefix: Prefijo para todos los índices
            timeout: Timeout de conexión en segundos
        """
        if not ELASTICSEARCH_DISPONIBLE:
            raise RuntimeError(
                "elasticsearch-py no está instalado. "
                "Ejecuta: pip install elasticsearch"
            )
        
        self.url = url or settings.ELASTICSEARCH_URL
        self.prefix = index_prefix
        self.timeout = timeout
        
        self._client: Optional[Elasticsearch] = None
        self._conectado = False
        
        # Nombres de índices
        self._index_names = get_all_index_names(self.prefix)
        
        logger.info(f"ElasticSearchService configurado: {self.url}")
    
    # ========================================================================
    # PROPIEDADES
    # ========================================================================
    
    @property
    def client(self) -> Elasticsearch:
        """Cliente de ElasticSearch (conecta si es necesario)."""
        if not self._client or not self._conectado:
            self.conectar()
        return self._client
    
    @property
    def index_manifiestos(self) -> str:
        """Nombre del índice de manifiestos."""
        return self._index_names["manifiestos"]
    
    @property
    def index_codigos(self) -> str:
        """Nombre del índice de códigos."""
        return self._index_names["codigos"]
    
    @property
    def index_busquedas(self) -> str:
        """Nombre del índice de búsquedas."""
        return self._index_names["busquedas"]
    
    @property
    def index_facturas(self) -> str:
        """Nombre del índice de facturas."""
        return self._index_names["facturas"]
    
    @property
    def esta_conectado(self) -> bool:
        """Indica si hay conexión activa."""
        return self._conectado and self._client is not None
    
    # ========================================================================
    # CONEXIÓN
    # ========================================================================
    
    def conectar(self) -> bool:
        """
        Establece conexión con ElasticSearch.
        
        Returns:
            True si la conexión fue exitosa
        """
        try:
            self._client = Elasticsearch(
                [self.url],
                request_timeout=self.timeout,
                retry_on_timeout=True,
                max_retries=3,
            )
            
            if self._client.ping():
                info = self._client.info()
                version = info.get("version", {}).get("number", "?")
                cluster = info.get("cluster_name", "?")
                
                logger.info(
                    f"✅ Conectado a ElasticSearch {version} "
                    f"(cluster: {cluster})"
                )
                self._conectado = True
                return True
            else:
                logger.error("❌ ElasticSearch no responde a ping")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error conectando a ElasticSearch: {e}")
            self._conectado = False
            return False
    
    def desconectar(self) -> None:
        """Cierra la conexión con ElasticSearch."""
        if self._client:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None
            self._conectado = False
            logger.info("Desconectado de ElasticSearch")
    
    def health_check(self) -> Dict[str, Any]:
        """
        Verifica el estado del cluster de ElasticSearch.
        
        Returns:
            Dict con información de salud del cluster
        """
        try:
            health = self.client.cluster.health()
            
            return {
                "conectado": True,
                "cluster": health.get("cluster_name"),
                "estado": health.get("status"),
                "nodos": health.get("number_of_nodes"),
                "shards_activos": health.get("active_shards"),
                "shards_pendientes": health.get("relocating_shards"),
            }
        except Exception as e:
            return {
                "conectado": False,
                "error": str(e),
            }
    
    # ========================================================================
    # GESTIÓN DE ÍNDICES
    # ========================================================================
    
    def crear_indices(self, forzar: bool = False) -> Dict[str, bool]:
        """
        Crea todos los índices necesarios.
        
        Args:
            forzar: Si True, elimina y recrea índices existentes
            
        Returns:
            Dict con resultado por índice
        """
        resultados = {}
        
        for nombre_logico, nombre_indice in self._index_names.items():
            try:
                # Obtener mapping correspondiente
                mapping_key = f"manifiestos{'_' + nombre_logico if nombre_logico != 'manifiestos' else ''}"
                mapping = INDICES_CONFIG.get(mapping_key)
                
                if not mapping:
                    logger.warning(f"No hay mapping para: {nombre_logico}")
                    resultados[nombre_logico] = False
                    continue
                
                existe = self.client.indices.exists(index=nombre_indice)
                
                if existe and forzar:
                    self.client.indices.delete(index=nombre_indice)
                    logger.info(f"🗑️ Índice eliminado: {nombre_indice}")
                    existe = False
                
                if not existe:
                    self.client.indices.create(
                        index=nombre_indice,
                        body=mapping
                    )
                    logger.info(f"✅ Índice creado: {nombre_indice}")
                    resultados[nombre_logico] = True
                else:
                    logger.debug(f"ℹ️ Índice ya existe: {nombre_indice}")
                    resultados[nombre_logico] = True
                    
            except Exception as e:
                logger.error(f"❌ Error creando índice {nombre_indice}: {e}")
                resultados[nombre_logico] = False
        
        return resultados
    
    def eliminar_indice(self, nombre: str) -> bool:
        """
        Elimina un índice específico.
        
        Args:
            nombre: Nombre del índice (lógico o completo)
            
        Returns:
            True si se eliminó correctamente
        """
        try:
            nombre_indice = self._index_names.get(nombre, nombre)
            
            if self.client.indices.exists(index=nombre_indice):
                self.client.indices.delete(index=nombre_indice)
                logger.info(f"🗑️ Índice eliminado: {nombre_indice}")
                return True
            else:
                logger.warning(f"Índice no existe: {nombre_indice}")
                return False
                
        except Exception as e:
            logger.error(f"Error eliminando índice: {e}")
            return False
    
    def obtener_info_indices(self) -> Dict[str, Any]:
        """
        Obtiene información de todos los índices.
        
        Returns:
            Dict con información de cada índice
        """
        info = {}
        
        for nombre_logico, nombre_indice in self._index_names.items():
            try:
                if self.client.indices.exists(index=nombre_indice):
                    stats = self.client.indices.stats(index=nombre_indice)
                    idx_stats = stats["indices"].get(nombre_indice, {})
                    primaries = idx_stats.get("primaries", {})
                    
                    info[nombre_logico] = {
                        "nombre": nombre_indice,
                        "existe": True,
                        "documentos": primaries.get("docs", {}).get("count", 0),
                        "tamaño_bytes": primaries.get("store", {}).get("size_in_bytes", 0),
                        "tamaño_humano": self._bytes_to_human(
                            primaries.get("store", {}).get("size_in_bytes", 0)
                        ),
                    }
                else:
                    info[nombre_logico] = {
                        "nombre": nombre_indice,
                        "existe": False,
                    }
            except Exception as e:
                info[nombre_logico] = {
                    "nombre": nombre_indice,
                    "error": str(e),
                }
        
        return info
    
    def actualizar_mapping(
        self,
        nombre: str,
        nuevos_campos: Dict[str, Any]
    ) -> bool:
        """
        Actualiza el mapping de un índice (agrega nuevos campos).
        
        Args:
            nombre: Nombre del índice
            nuevos_campos: Definición de nuevos campos
            
        Returns:
            True si se actualizó correctamente
        """
        try:
            nombre_indice = self._index_names.get(nombre, nombre)
            
            self.client.indices.put_mapping(
                index=nombre_indice,
                body={"properties": nuevos_campos}
            )
            
            logger.info(f"Mapping actualizado: {nombre_indice}")
            return True
            
        except Exception as e:
            logger.error(f"Error actualizando mapping: {e}")
            return False
    
    # ========================================================================
    # INDEXACIÓN DE MANIFIESTOS
    # ========================================================================
    
    def indexar_manifiesto(
        self,
        documento_id: int,
        nombre_archivo: str,
        texto_completo: str,
        texto_por_pagina: Optional[Dict[int, str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        codigos_resumen: Optional[List[str]] = None,
        **kwargs
    ) -> Optional[str]:
        """
        Indexa un manifiesto completo.
        
        Args:
            documento_id: ID del documento en la BD
            nombre_archivo: Nombre del archivo
            texto_completo: Texto completo extraído
            texto_por_pagina: Dict {pagina: texto}
            metadata: Metadatos del documento
            codigos_resumen: Lista de códigos encontrados
            **kwargs: Campos adicionales
            
        Returns:
            ID del documento indexado o None
        """
        try:
            doc = {
                "documento_id": documento_id,
                "nombre_archivo": nombre_archivo,
                "tipo_documento": kwargs.get("tipo_documento", "manifiesto"),
                "texto_completo": texto_completo,
                "metadata": metadata or {},
                "total_paginas": kwargs.get("total_paginas", 0),
                "total_codigos": kwargs.get("total_codigos", 0),
                "codigos_unicos": kwargs.get("codigos_unicos", 0),
                "tamaño_bytes": kwargs.get("tamaño_bytes", 0),
                "caracteres_totales": len(texto_completo),
                "ocr_aplicado": kwargs.get("ocr_aplicado", False),
                "codigos_resumen": codigos_resumen or [],
                "tipos_codigo": kwargs.get("tipos_codigo", []),
                "usuario_id": kwargs.get("usuario_id"),
                "fecha_carga": kwargs.get("fecha_carga", datetime.now().isoformat()),
                "fecha_indexacion": datetime.now().isoformat(),
                "estado": kwargs.get("estado", "indexado"),
                "version": 1,
            }
            
            if texto_por_pagina:
                doc["texto_por_pagina"] = [
                    {"pagina": pag, "texto": txt}
                    for pag, txt in texto_por_pagina.items()
                ]
            
            result = self.client.index(
                index=self.index_manifiestos,
                id=str(documento_id),
                body=doc
            )
            
            logger.info(
                f"✅ Manifiesto indexado: {documento_id} - {nombre_archivo}"
            )
            
            return result["_id"]
            
        except Exception as e:
            logger.error(f"❌ Error indexando manifiesto: {e}")
            return None
    
    # ========================================================================
    # INDEXACIÓN DE CÓDIGOS
    # ========================================================================
    
    def indexar_codigo(
        self,
        documento_id: int,
        codigo: str,
        tipo_codigo: str,
        pagina: int,
        **kwargs
    ) -> Optional[str]:
        """
        Indexa un código individual.
        
        Args:
            documento_id: ID del documento
            codigo: Código a indexar
            tipo_codigo: Tipo de código
            pagina: Número de página
            **kwargs: Campos adicionales
            
        Returns:
            ID del documento indexado o None
        """
        try:
            codigo_normalizado = self._normalizar_codigo(codigo)
            doc_id = f"{documento_id}_{codigo_normalizado}_{pagina}"
            
            doc = {
                "id": doc_id,
                "documento_id": documento_id,
                "nombre_documento": kwargs.get("nombre_documento", ""),
                "codigo": codigo,
                "tipo_codigo": tipo_codigo,
                "pagina": pagina,
                "linea": kwargs.get("linea", 0),
                "columna": kwargs.get("columna", 0),
                "posicion_inicio": kwargs.get("posicion_inicio", 0),
                "posicion_fin": kwargs.get("posicion_fin", 0),
                "contexto": kwargs.get("contexto", ""),
                "contexto_antes": kwargs.get("contexto_antes", ""),
                "contexto_despues": kwargs.get("contexto_despues", ""),
                "es_valido": kwargs.get("es_valido", True),
                "validado_checksum": kwargs.get("validado_checksum", False),
                "patron_usado": kwargs.get("patron_usado", ""),
                "frecuencia": kwargs.get("frecuencia", 1),
                "es_duplicado": kwargs.get("es_duplicado", False),
                "fecha_extraccion": kwargs.get(
                    "fecha_extraccion", datetime.now().isoformat()
                ),
                "fecha_indexacion": datetime.now().isoformat(),
            }
            
            result = self.client.index(
                index=self.index_codigos,
                id=doc_id,
                body=doc
            )
            
            return result["_id"]
            
        except Exception as e:
            logger.error(f"Error indexando código: {e}")
            return None
    
    def indexar_codigos_bulk(
        self,
        codigos: List[Dict[str, Any]],
        documento_id: int,
        nombre_documento: str = "",
    ) -> Tuple[int, int]:
        """
        Indexa múltiples códigos en lote.
        
        Args:
            codigos: Lista de diccionarios con datos de códigos
            documento_id: ID del documento
            nombre_documento: Nombre del documento
            
        Returns:
            Tuple (exitosos, fallidos)
        """
        if not codigos:
            return (0, 0)
        
        acciones = []
        
        for cod in codigos:
            codigo = cod.get("codigo", "")
            codigo_normalizado = self._normalizar_codigo(codigo)
            pagina = cod.get("pagina", 1)
            doc_id = f"{documento_id}_{codigo_normalizado}_{pagina}"
            
            accion = {
                "_index": self.index_codigos,
                "_id": doc_id,
                "_source": {
                    "id": doc_id,
                    "documento_id": documento_id,
                    "nombre_documento": nombre_documento,
                    "codigo": codigo,
                    "tipo_codigo": cod.get("tipo", "desconocido"),
                    "pagina": pagina,
                    "linea": cod.get("linea", 0),
                    "columna": cod.get("columna", 0),
                    "contexto": cod.get("contexto", ""),
                    "es_valido": cod.get("es_valido", True),
                    "frecuencia": cod.get("frecuencia", 1),
                    "es_duplicado": cod.get("es_duplicado", False),
                    "fecha_extraccion": cod.get(
                        "fecha_extraccion", datetime.now().isoformat()
                    ),
                    "fecha_indexacion": datetime.now().isoformat(),
                }
            }
            acciones.append(accion)
        
        try:
            exitosos, errores = bulk(
                self.client,
                acciones,
                raise_on_error=False,
                stats_only=False
            )
            
            fallidos = len(errores) if isinstance(errores, list) else 0
            
            logger.info(
                f"Bulk indexación: {exitosos} exitosos, {fallidos} fallidos"
            )
            
            return (exitosos, fallidos)
            
        except Exception as e:
            logger.error(f"Error en bulk indexación: {e}")
            return (0, len(codigos))
    
    # ========================================================================
    # BÚSQUEDA DE CÓDIGOS
    # ========================================================================
    
    def buscar_codigo_exacto(
        self,
        codigo: str,
        documento_id: Optional[int] = None,
        limite: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Busca un código con coincidencia exacta.
        
        Intenta encontrar el código usando múltiples estrategias para
        cualquier formato de código (contenedores, referencias, BL, etc.):
        1. Coincidencia exacta en keyword
        2. Coincidencia normalizada (sin separadores)
        3. Variaciones con separadores comunes
        4. Match en campo analizado
        
        Args:
            codigo: Código a buscar (cualquier formato)
            documento_id: Filtrar por documento (opcional)
            limite: Máximo de resultados
            
        Returns:
            Lista de coincidencias
        """
        codigo_normalizado = self._normalizar_codigo(codigo)
        codigo_upper = codigo.upper()
        codigo_lower = codigo.lower()
        
        # Generar todas las variaciones posibles del código
        variaciones = self._generar_variaciones_codigo(codigo)
        
        # Eliminar duplicados manteniendo orden
        variaciones_unicas = list(dict.fromkeys(variaciones))
        
        # Construir cláusulas de búsqueda
        should_clauses = []
        
        # Búsqueda exacta por keyword para cada variación
        for variacion in variaciones_unicas:
            should_clauses.append({"term": {"codigo.keyword": variacion}})
        
        # Búsqueda con wildcard para coincidencias parciales
        # Útil para encontrar códigos con separadores diferentes
        should_clauses.append({
            "wildcard": {
                "codigo.keyword": {
                    "value": f"*{codigo_normalizado}*",
                    "case_insensitive": True
                }
            }
        })
        
        # Match analizado con todos los términos
        should_clauses.append({
            "match": {
                "codigo": {
                    "query": codigo,
                    "operator": "and"
                }
            }
        })
        
        # Match phrase para secuencia exacta
        should_clauses.append({
            "match_phrase": {
                "codigo": codigo
            }
        })
        
        query = {
            "bool": {
                "should": should_clauses,
                "minimum_should_match": 1
            }
        }
        
        if documento_id:
            query["bool"]["filter"] = [
                {"term": {"documento_id": documento_id}}
            ]
        
        return self._ejecutar_busqueda(self.index_codigos, query, limite)
    
    def _generar_variaciones_codigo(self, codigo: str) -> List[str]:
        """
        Genera todas las variaciones posibles de un código.
        
        Crea versiones con y sin separadores para maximizar
        las posibilidades de encontrar coincidencias.
        
        Args:
            codigo: Código original
            
        Returns:
            Lista de variaciones del código
        """
        variaciones = []
        codigo_upper = codigo.upper()
        codigo_lower = codigo.lower()
        codigo_normalizado = self._normalizar_codigo(codigo)
        
        # 1. Código original y variaciones de caso
        variaciones.extend([codigo, codigo_upper, codigo_lower])
        
        # 2. Versión normalizada (sin separadores)
        variaciones.append(codigo_normalizado)
        variaciones.append(codigo_normalizado.lower())
        
        # 3. Detectar patrón alfanumérico y generar variaciones con separadores
        # Buscar transiciones letra->número y número->letra
        separadores = ["-", "_", " ", "/", "."]
        
        # Generar versiones con separadores en transiciones
        for sep in separadores:
            version_con_sep = self._insertar_separadores(codigo_normalizado, sep)
            if version_con_sep != codigo_normalizado:
                variaciones.append(version_con_sep)
                variaciones.append(version_con_sep.upper())
        
        # 4. Para códigos con patrones específicos conocidos
        # Contenedor ISO: XXXX-NNNNNNN (4 letras, 7 números)
        if len(codigo_normalizado) == 11 and codigo_normalizado[:4].isalpha() and codigo_normalizado[4:].isdigit():
            variaciones.append(f"{codigo_normalizado[:4]}-{codigo_normalizado[4:]}")
        
        # Referencia tipo REF-YYYY-NNN
        if codigo_normalizado.startswith("REF") and len(codigo_normalizado) >= 7:
            # REF2024001 -> REF-2024-001
            rest = codigo_normalizado[3:]
            if len(rest) >= 4:
                variaciones.append(f"REF-{rest[:4]}-{rest[4:]}")
        
        # BL tipo BL-XXXNNNNN
        if codigo_normalizado.startswith("BL") and len(codigo_normalizado) >= 5:
            variaciones.append(f"BL-{codigo_normalizado[2:]}")
        
        # 5. Si el código original tiene separadores, agregar versión sin ellos
        if any(sep in codigo for sep in separadores):
            variaciones.append(codigo_normalizado)
        
        return variaciones
    
    def _insertar_separadores(self, codigo: str, separador: str) -> str:
        """
        Inserta separadores en transiciones letra-número.
        
        Args:
            codigo: Código sin separadores
            separador: Carácter separador a usar
            
        Returns:
            Código con separadores insertados
        """
        if not codigo:
            return codigo
        
        resultado = [codigo[0]]
        
        for i in range(1, len(codigo)):
            char_actual = codigo[i]
            char_anterior = codigo[i - 1]
            
            # Insertar separador en transición letra->número o número->letra
            if (char_anterior.isalpha() and char_actual.isdigit()) or \
               (char_anterior.isdigit() and char_actual.isalpha()):
                resultado.append(separador)
            
            resultado.append(char_actual)
        
        return "".join(resultado)
    
    def buscar_codigo_fuzzy(
        self,
        codigo: str,
        documento_id: Optional[int] = None,
        fuzziness: str = "AUTO",
        limite: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Busca un código con tolerancia a errores (fuzzy).
        
        Args:
            codigo: Código a buscar
            documento_id: Filtrar por documento (opcional)
            fuzziness: Nivel de fuzzy (AUTO, 0, 1, 2)
            limite: Máximo de resultados
            
        Returns:
            Lista de coincidencias
        """
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
                            "codigo.fuzzy": {
                                "query": codigo,
                                "boost": 0.5,
                            }
                        }
                    },
                ],
                "minimum_should_match": 1,
            }
        }
        
        if documento_id:
            query["bool"]["filter"] = [
                {"term": {"documento_id": documento_id}}
            ]
        
        return self._ejecutar_busqueda(self.index_codigos, query, limite)
    
    def buscar_codigo_prefijo(
        self,
        prefijo: str,
        documento_id: Optional[int] = None,
        limite: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Busca códigos que empiecen con un prefijo.
        
        Args:
            prefijo: Prefijo a buscar
            documento_id: Filtrar por documento (opcional)
            limite: Máximo de resultados
            
        Returns:
            Lista de coincidencias
        """
        query = {
            "bool": {
                "must": [
                    {
                        "prefix": {
                            "codigo.keyword": prefijo.upper()
                        }
                    }
                ]
            }
        }
        
        if documento_id:
            query["bool"]["filter"] = [
                {"term": {"documento_id": documento_id}}
            ]
        
        return self._ejecutar_busqueda(self.index_codigos, query, limite)
    
    def buscar_codigos_multiple(
        self,
        codigos: List[str],
        documento_id: Optional[int] = None,
        exacto: bool = True,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Busca múltiples códigos a la vez.
        
        Args:
            codigos: Lista de códigos a buscar
            documento_id: Filtrar por documento (opcional)
            exacto: Si True, búsqueda exacta; si False, fuzzy
            
        Returns:
            Dict {codigo: [coincidencias]}
        """
        resultados = {}
        
        for codigo in codigos:
            if exacto:
                coincidencias = self.buscar_codigo_exacto(codigo, documento_id)
            else:
                coincidencias = self.buscar_codigo_fuzzy(codigo, documento_id)
            
            resultados[codigo] = coincidencias
        
        return resultados
    
    def buscar_en_manifiesto(
        self,
        texto: str,
        documento_id: Optional[int] = None,
        limite: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Busca texto en el contenido de manifiestos.
        
        Args:
            texto: Texto a buscar
            documento_id: Filtrar por documento
            limite: Máximo de resultados
            
        Returns:
            Lista de coincidencias con resaltado
        """
        query = {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": texto,
                            "fields": [
                                "texto_completo",
                                "texto_por_pagina.texto",
                            ],
                            "type": "best_fields",
                        }
                    }
                ]
            }
        }
        
        if documento_id:
            query["bool"]["filter"] = [
                {"term": {"documento_id": documento_id}}
            ]
        
        try:
            result = self.client.search(
                index=self.index_manifiestos,
                body={
                    "query": query,
                    "size": limite,
                    "highlight": {
                        "fields": {
                            "texto_completo": {},
                            "texto_por_pagina.texto": {},
                        },
                        "pre_tags": ["<mark>"],
                        "post_tags": ["</mark>"],
                    }
                }
            )
            
            hits = []
            for hit in result["hits"]["hits"]:
                item = hit["_source"]
                item["_score"] = hit["_score"]
                item["_highlight"] = hit.get("highlight", {})
                hits.append(item)
            
            return hits
            
        except Exception as e:
            logger.error(f"Error buscando en manifiesto: {e}")
            return []
    
    # ========================================================================
    # ELIMINACIÓN
    # ========================================================================
    
    def eliminar_documento(self, documento_id: int) -> bool:
        """
        Elimina un documento y todos sus códigos de los índices.
        
        Args:
            documento_id: ID del documento
            
        Returns:
            True si se eliminó correctamente
        """
        try:
            try:
                self.client.delete(
                    index=self.index_manifiestos,
                    id=str(documento_id)
                )
            except NotFoundError:
                pass
            
            self.client.delete_by_query(
                index=self.index_codigos,
                body={
                    "query": {
                        "term": {"documento_id": documento_id}
                    }
                }
            )
            
            logger.info(f"Documento {documento_id} eliminado de ES")
            return True
            
        except Exception as e:
            logger.error(f"Error eliminando documento de ES: {e}")
            return False
    
    # ========================================================================
    # UTILIDADES
    # ========================================================================
    
    def _ejecutar_busqueda(
        self,
        index: str,
        query: Dict[str, Any],
        limite: int,
    ) -> List[Dict[str, Any]]:
        """Ejecuta una búsqueda y retorna resultados."""
        try:
            result = self.client.search(
                index=index,
                body={"query": query, "size": limite}
            )
            
            return [hit["_source"] for hit in result["hits"]["hits"]]
            
        except Exception as e:
            logger.error(f"Error ejecutando búsqueda: {e}")
            return []
    
    def _normalizar_codigo(self, codigo: str) -> str:
        """Normaliza un código para búsqueda."""
        return (
            codigo
            .upper()
            .replace(" ", "")
            .replace("-", "")
            .replace("_", "")
            .replace(".", "")
            .replace("/", "")
        )
    
    def _bytes_to_human(self, bytes_size: int) -> str:
        """Convierte bytes a formato legible."""
        for unit in ["B", "KB", "MB", "GB"]:
            if bytes_size < 1024:
                return f"{bytes_size:.1f} {unit}"
            bytes_size /= 1024
        return f"{bytes_size:.1f} TB"
    
    def contar_documentos(self, index: Optional[str] = None) -> int:
        """Cuenta documentos en un índice."""
        try:
            idx = index or self.index_manifiestos
            result = self.client.count(index=idx)
            return result["count"]
        except Exception:
            return 0
    
    def refresh_indices(self) -> bool:
        """Fuerza refresh de todos los índices."""
        try:
            for nombre_indice in self._index_names.values():
                if self.client.indices.exists(index=nombre_indice):
                    self.client.indices.refresh(index=nombre_indice)
            return True
        except Exception as e:
            logger.error(f"Error en refresh: {e}")
            return False
    
    def estadisticas(self) -> Dict[str, Any]:
        """Obtiene estadísticas de los índices."""
        return self.obtener_info_indices()


# Instancia global (lazy)
_es_service: Optional[ElasticSearchService] = None


def get_elasticsearch_service() -> Optional[ElasticSearchService]:
    """Obtiene la instancia global del servicio de ElasticSearch."""
    global _es_service
    
    if not ELASTICSEARCH_DISPONIBLE:
        return None
    
    if _es_service is None:
        try:
            _es_service = ElasticSearchService(
                url=settings.ELASTICSEARCH_URL,
                index_prefix=settings.ELASTICSEARCH_INDEX,
            )
        except Exception as e:
            logger.warning(f"No se pudo inicializar ElasticSearch: {e}")
            return None
    
    return _es_service

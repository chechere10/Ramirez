"""
Configuración avanzada de ElasticSearch para ManifestoCross.
Fase 4.1 - Índices, mappings, analizadores y tokenizadores.
"""

from typing import Any, Dict

# ============================================================================
# CONFIGURACIÓN DE ANÁLISIS DE TEXTO
# ============================================================================

# Filtros personalizados
CUSTOM_FILTERS = {
    # Filtro para normalizar códigos (eliminar separadores)
    "codigo_normalizer": {
        "type": "pattern_replace",
        "pattern": "[\\s\\-_./]",
        "replacement": ""
    },
    # Filtro para preservar guiones en códigos de contenedor
    "container_code_filter": {
        "type": "pattern_replace",
        "pattern": "([A-Z]{4})(\\d{7})",
        "replacement": "$1$2"
    },
    # Filtro para eliminar caracteres especiales pero preservar alfanuméricos
    "alphanumeric_only": {
        "type": "pattern_replace",
        "pattern": "[^a-zA-Z0-9]",
        "replacement": ""
    },
    # Filtro para extraer solo números
    "numbers_only": {
        "type": "pattern_replace",
        "pattern": "[^0-9]",
        "replacement": ""
    },
    # Filtro de sinónimos para variaciones comunes
    "codigo_synonyms": {
        "type": "synonym",
        "synonyms": [
            "contenedor,container,cntr,cont",
            "factura,invoice,fact,inv",
            "manifiesto,manifest,mfst",
            "referencia,ref,reference",
            "pedido,order,ped,ord",
        ]
    },
    # Filtro para n-gramas (búsqueda parcial)
    "codigo_ngram": {
        "type": "ngram",
        "min_gram": 3,
        "max_gram": 15
    },
    # Filtro edge n-gram (búsqueda por prefijo)
    "codigo_edge_ngram": {
        "type": "edge_ngram",
        "min_gram": 2,
        "max_gram": 20
    },
    # Filtro para stemming en español
    "spanish_stemmer": {
        "type": "stemmer",
        "language": "spanish"
    },
    # Filtro para stemming en inglés
    "english_stemmer": {
        "type": "stemmer",
        "language": "english"
    },
    # Stop words español
    "spanish_stop": {
        "type": "stop",
        "stopwords": "_spanish_"
    },
    # Stop words inglés
    "english_stop": {
        "type": "stop",
        "stopwords": "_english_"
    },
}

# Tokenizadores personalizados
CUSTOM_TOKENIZERS = {
    # Tokenizador para códigos (divide en tokens alfanuméricos)
    "codigo_tokenizer": {
        "type": "pattern",
        "pattern": "[\\s,;|\\-_/]+",
        "lowercase": False
    },
    # Tokenizador para contenedores ISO 6346 (XXXX1234567)
    "container_tokenizer": {
        "type": "pattern",
        "pattern": "([A-Z]{4}\\d{7})",
        "group": 1
    },
    # Tokenizador para códigos de barras
    "barcode_tokenizer": {
        "type": "pattern",
        "pattern": "(\\d{8,14})",
        "group": 1
    },
    # Tokenizador para referencias alfanuméricas
    "reference_tokenizer": {
        "type": "pattern",
        "pattern": "([A-Z0-9]{4,20})",
        "group": 1
    },
    # Tokenizador path (para rutas de archivo)
    "path_tokenizer": {
        "type": "path_hierarchy",
        "delimiter": "/",
        "replacement": "/"
    },
    # Tokenizador de n-gramas para búsqueda parcial
    "ngram_tokenizer": {
        "type": "ngram",
        "min_gram": 3,
        "max_gram": 10,
        "token_chars": ["letter", "digit"]
    },
}

# Analizadores personalizados
CUSTOM_ANALYZERS = {
    # Analizador principal para códigos
    "codigo_analyzer": {
        "type": "custom",
        "tokenizer": "codigo_tokenizer",
        "filter": ["uppercase", "trim", "codigo_normalizer"]
    },
    # Analizador para búsqueda exacta de códigos
    "codigo_exact_analyzer": {
        "type": "custom",
        "tokenizer": "keyword",
        "filter": ["uppercase", "trim", "alphanumeric_only"]
    },
    # Analizador para códigos de contenedor ISO 6346
    "container_analyzer": {
        "type": "custom",
        "tokenizer": "keyword",
        "filter": ["uppercase", "trim", "container_code_filter"]
    },
    # Analizador para códigos de barras (EAN, UPC)
    "barcode_analyzer": {
        "type": "custom",
        "tokenizer": "keyword",
        "filter": ["trim", "numbers_only"]
    },
    # Analizador para búsqueda fuzzy de códigos
    "codigo_fuzzy_analyzer": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": ["lowercase", "trim", "codigo_ngram"]
    },
    # Analizador para búsqueda por prefijo
    "codigo_prefix_analyzer": {
        "type": "custom",
        "tokenizer": "keyword",
        "filter": ["uppercase", "trim", "codigo_edge_ngram"]
    },
    # Analizador para texto en español
    "spanish_text_analyzer": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": [
            "lowercase",
            "spanish_stop",
            "spanish_stemmer",
            "asciifolding"
        ]
    },
    # Analizador para texto en inglés
    "english_text_analyzer": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": [
            "lowercase",
            "english_stop",
            "english_stemmer",
            "asciifolding"
        ]
    },
    # Analizador multilenguaje (español + inglés)
    "multilang_analyzer": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": [
            "lowercase",
            "asciifolding",
            "spanish_stop",
            "english_stop"
        ]
    },
    # Analizador para nombres de archivo
    "filename_analyzer": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": ["lowercase", "asciifolding"]
    },
}

# Normalizadores para campos keyword
CUSTOM_NORMALIZERS = {
    # Normalizador para códigos (uppercase, sin espacios)
    "codigo_normalizer": {
        "type": "custom",
        "filter": ["uppercase", "trim"]
    },
    # Normalizador lowercase
    "lowercase_normalizer": {
        "type": "custom",
        "filter": ["lowercase", "trim"]
    },
}


# ============================================================================
# CONFIGURACIÓN DE SETTINGS DEL ÍNDICE
# ============================================================================

def get_index_settings(
    shards: int = 1,
    replicas: int = 0,
    refresh_interval: str = "1s",
) -> Dict[str, Any]:
    """
    Genera la configuración de settings para un índice.
    
    Args:
        shards: Número de shards primarios
        replicas: Número de réplicas
        refresh_interval: Intervalo de refresh
        
    Returns:
        Dict con configuración de settings
    """
    return {
        "number_of_shards": shards,
        "number_of_replicas": replicas,
        "refresh_interval": refresh_interval,
        "analysis": {
            "filter": CUSTOM_FILTERS,
            "tokenizer": CUSTOM_TOKENIZERS,
            "analyzer": CUSTOM_ANALYZERS,
            "normalizer": CUSTOM_NORMALIZERS,
        },
        # Configuración de índice
        "index": {
            "max_ngram_diff": 12,  # Permitir diferencia mayor en n-gramas
            "max_result_window": 50000,  # Más resultados para paginación
        },
    }


# ============================================================================
# MAPPING PARA ÍNDICE DE MANIFIESTOS
# ============================================================================

MANIFIESTO_INDEX_MAPPING = {
    "settings": get_index_settings(),
    "mappings": {
        "dynamic": "strict",  # No permitir campos no definidos
        "properties": {
            # Identificación
            "documento_id": {
                "type": "integer",
            },
            "nombre_archivo": {
                "type": "text",
                "analyzer": "filename_analyzer",
                "fields": {
                    "keyword": {
                        "type": "keyword",
                        "normalizer": "lowercase_normalizer"
                    },
                    "raw": {
                        "type": "keyword"
                    }
                }
            },
            "tipo_documento": {
                "type": "keyword",
            },
            "hash_archivo": {
                "type": "keyword",
            },
            
            # Contenido de texto
            "texto_completo": {
                "type": "text",
                "analyzer": "multilang_analyzer",
                "search_analyzer": "multilang_analyzer",
                "term_vector": "with_positions_offsets",  # Para resaltado
            },
            "texto_por_pagina": {
                "type": "nested",
                "properties": {
                    "pagina": {"type": "integer"},
                    "texto": {
                        "type": "text",
                        "analyzer": "multilang_analyzer",
                        "term_vector": "with_positions_offsets",
                    }
                }
            },
            
            # Metadatos del documento
            "metadata": {
                "type": "object",
                "properties": {
                    "autor": {"type": "keyword"},
                    "titulo": {"type": "text"},
                    "asunto": {"type": "text"},
                    "creador": {"type": "keyword"},
                    "productor": {"type": "keyword"},
                    "fecha_creacion": {"type": "date"},
                    "fecha_modificacion": {"type": "date"},
                }
            },
            
            # Estadísticas
            "total_paginas": {"type": "integer"},
            "total_codigos": {"type": "integer"},
            "codigos_unicos": {"type": "integer"},
            "tamaño_bytes": {"type": "long"},
            "caracteres_totales": {"type": "integer"},
            
            # Procesamiento
            "ocr_aplicado": {"type": "boolean"},
            "idioma_detectado": {"type": "keyword"},
            "confianza_ocr": {"type": "float"},
            
            # Resumen de códigos (para búsquedas rápidas)
            "codigos_resumen": {
                "type": "keyword",  # Lista de códigos normalizados
            },
            "tipos_codigo": {
                "type": "keyword",  # Tipos de código encontrados
            },
            
            # Auditoría
            "usuario_id": {"type": "integer"},
            "fecha_carga": {"type": "date"},
            "fecha_indexacion": {"type": "date"},
            "fecha_ultima_busqueda": {"type": "date"},
            "fecha_ultima_modificacion": {"type": "date"},
            
            # Control
            "estado": {"type": "keyword"},
            "version": {"type": "integer"},
        }
    }
}


# ============================================================================
# MAPPING PARA ÍNDICE DE CÓDIGOS
# ============================================================================

CODIGO_INDEX_MAPPING = {
    "settings": get_index_settings(),
    "mappings": {
        "dynamic": "strict",
        "properties": {
            # Identificación
            "id": {"type": "keyword"},
            "documento_id": {"type": "integer"},
            "nombre_documento": {
                "type": "keyword",
                "normalizer": "lowercase_normalizer"
            },
            
            # Código principal
            "codigo": {
                "type": "text",
                "analyzer": "codigo_analyzer",
                "search_analyzer": "codigo_exact_analyzer",
                "fields": {
                    # Para búsqueda exacta
                    "keyword": {
                        "type": "keyword",
                    },
                    # Para búsqueda normalizada (sin separadores)
                    "normalizado": {
                        "type": "keyword",
                        "normalizer": "codigo_normalizer"
                    },
                    # Para búsqueda fuzzy con n-gramas
                    "fuzzy": {
                        "type": "text",
                        "analyzer": "codigo_fuzzy_analyzer"
                    },
                    # Para autocompletado
                    "prefix": {
                        "type": "text",
                        "analyzer": "codigo_prefix_analyzer",
                        "search_analyzer": "codigo_exact_analyzer"
                    },
                    # Solo números (para códigos de barras)
                    "numerico": {
                        "type": "keyword",
                    }
                }
            },
            
            # Clasificación
            "tipo_codigo": {
                "type": "keyword",
            },
            "subtipo": {
                "type": "keyword",
            },
            "confianza": {
                "type": "float",
            },
            
            # Ubicación en el documento
            "pagina": {"type": "integer"},
            "linea": {"type": "integer"},
            "columna": {"type": "integer"},
            "posicion_inicio": {"type": "integer"},
            "posicion_fin": {"type": "integer"},
            
            # Contexto
            "contexto": {
                "type": "text",
                "analyzer": "multilang_analyzer",
            },
            "contexto_antes": {
                "type": "text",
                "analyzer": "standard"
            },
            "contexto_despues": {
                "type": "text",
                "analyzer": "standard"
            },
            
            # Validación
            "es_valido": {"type": "boolean"},
            "validado_checksum": {"type": "boolean"},
            "patron_usado": {"type": "keyword"},
            
            # Metadatos
            "frecuencia": {"type": "integer"},  # Veces que aparece
            "es_duplicado": {"type": "boolean"},
            "codigo_padre": {"type": "keyword"},  # Si es duplicado, ref al original
            
            # Fechas
            "fecha_extraccion": {"type": "date"},
            "fecha_indexacion": {"type": "date"},
        }
    }
}


# ============================================================================
# MAPPING PARA ÍNDICE DE BÚSQUEDAS (HISTORIAL)
# ============================================================================

BUSQUEDA_INDEX_MAPPING = {
    "settings": get_index_settings(refresh_interval="5s"),
    "mappings": {
        "properties": {
            # Identificación
            "busqueda_id": {"type": "integer"},
            "usuario_id": {"type": "integer"},
            
            # Códigos buscados
            "codigos_buscados": {
                "type": "keyword",
            },
            "total_codigos_buscados": {"type": "integer"},
            
            # Resultados
            "codigos_encontrados": {"type": "keyword"},
            "codigos_no_encontrados": {"type": "keyword"},
            "total_encontrados": {"type": "integer"},
            "total_no_encontrados": {"type": "integer"},
            "porcentaje_match": {"type": "float"},
            
            # Documentos involucrados
            "documento_ids": {"type": "integer"},
            "documento_nombres": {"type": "keyword"},
            
            # Tiempos
            "tiempo_busqueda_ms": {"type": "integer"},
            "fecha_busqueda": {"type": "date"},
            
            # Configuración usada
            "busqueda_exacta": {"type": "boolean"},
            "busqueda_fuzzy": {"type": "boolean"},
            "tolerancia_fuzzy": {"type": "keyword"},
        }
    }
}


# ============================================================================
# MAPPING PARA ÍNDICE DE FACTURAS
# ============================================================================

FACTURA_INDEX_MAPPING = {
    "settings": get_index_settings(),
    "mappings": {
        "dynamic": "strict",
        "properties": {
            # Identificación
            "factura_id": {"type": "integer"},
            "documento_id": {"type": "integer"},
            "numero_factura": {
                "type": "keyword",
            },
            "nombre_archivo": {
                "type": "text",
                "analyzer": "filename_analyzer",
                "fields": {
                    "keyword": {"type": "keyword"}
                }
            },
            
            # Códigos de la factura
            "codigos": {
                "type": "nested",
                "properties": {
                    "codigo": {
                        "type": "keyword",
                    },
                    "codigo_normalizado": {
                        "type": "keyword",
                    },
                    "tipo": {"type": "keyword"},
                    "origen": {"type": "keyword"},  # manual, pdf, csv, excel
                    "linea_origen": {"type": "integer"},
                    "es_valido": {"type": "boolean"},
                }
            },
            
            # Resumen para búsquedas rápidas
            "codigos_lista": {
                "type": "keyword",
            },
            "total_codigos": {"type": "integer"},
            
            # Metadatos
            "proveedor": {"type": "keyword"},
            "fecha_factura": {"type": "date"},
            "monto_total": {"type": "float"},
            "moneda": {"type": "keyword"},
            
            # Auditoría
            "usuario_id": {"type": "integer"},
            "fecha_carga": {"type": "date"},
            "fecha_indexacion": {"type": "date"},
            
            # Estado
            "estado": {"type": "keyword"},
            "procesado": {"type": "boolean"},
        }
    }
}


# ============================================================================
# CONFIGURACIÓN DE ÍNDICES COMPLETA
# ============================================================================

INDICES_CONFIG = {
    "manifiestos": MANIFIESTO_INDEX_MAPPING,
    "manifiestos_codigos": CODIGO_INDEX_MAPPING,
    "manifiestos_busquedas": BUSQUEDA_INDEX_MAPPING,
    "manifiestos_facturas": FACTURA_INDEX_MAPPING,
}


def get_all_index_names(prefix: str = "manifiestos") -> dict:
    """
    Obtiene los nombres de todos los índices con un prefijo.
    
    Args:
        prefix: Prefijo base para los índices
        
    Returns:
        Dict con nombres de índices
    """
    return {
        "manifiestos": prefix,
        "codigos": f"{prefix}_codigos",
        "busquedas": f"{prefix}_busquedas",
        "facturas": f"{prefix}_facturas",
    }

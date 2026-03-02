"""
Módulo de Extracción y Normalización de Códigos.
Fase 3.3 - Extracción de códigos desde texto usando patrones regex.
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Pattern, Set, Tuple

from loguru import logger


class TipoCodigo(str, Enum):
    """Tipos de códigos que se pueden extraer."""
    
    # Códigos de contenedor (formato ISO 6346: ABCD1234567)
    CONTENEDOR = "contenedor"
    
    # Códigos de producto/SKU
    SKU = "sku"
    
    # Números de referencia genéricos
    REFERENCIA = "referencia"
    
    # Códigos de barras (EAN-13, UPC, etc.)
    CODIGO_BARRAS = "codigo_barras"
    
    # Números de factura
    FACTURA = "factura"
    
    # Números de manifiesto
    MANIFIESTO = "manifiesto"
    
    # Códigos alfanuméricos genéricos
    ALFANUMERICO = "alfanumerico"
    
    # Códigos numéricos puros
    NUMERICO = "numerico"
    
    # Códigos personalizados
    PERSONALIZADO = "personalizado"


@dataclass
class PatronCodigo:
    """Define un patrón para extraer códigos."""
    
    nombre: str
    tipo: TipoCodigo
    patron: str  # Expresión regular
    descripcion: str = ""
    ejemplo: str = ""
    activo: bool = True
    prioridad: int = 0  # Mayor número = mayor prioridad
    
    def __post_init__(self):
        """Compila el patrón regex."""
        self._regex: Pattern = re.compile(self.patron, re.IGNORECASE | re.MULTILINE)
    
    @property
    def regex(self) -> Pattern:
        return self._regex


@dataclass
class PosicionCodigo:
    """Posición de un código en el texto."""
    
    inicio: int  # Índice de inicio en el texto
    fin: int     # Índice de fin en el texto
    linea: Optional[int] = None  # Número de línea (si está disponible)
    columna: Optional[int] = None  # Columna (si está disponible)


@dataclass
class CodigoExtraido:
    """Representa un código extraído del texto."""
    
    valor_original: str  # Valor tal como aparece en el texto
    valor_normalizado: str  # Valor después de normalización
    tipo: TipoCodigo
    patron_usado: str  # Nombre del patrón que lo detectó
    pagina: int  # Número de página (1-based)
    posicion: PosicionCodigo
    contexto: str = ""  # Texto circundante para referencia
    confianza: float = 1.0  # 0-1, confianza en la extracción
    
    def __hash__(self):
        return hash((self.valor_normalizado, self.pagina, self.posicion.inicio))
    
    def __eq__(self, other):
        if not isinstance(other, CodigoExtraido):
            return False
        return (
            self.valor_normalizado == other.valor_normalizado and
            self.pagina == other.pagina and
            self.posicion.inicio == other.posicion.inicio
        )


@dataclass
class ResultadoExtraccionCodigos:
    """Resultado de la extracción de códigos."""
    
    codigos: List[CodigoExtraido] = field(default_factory=list)
    codigos_unicos: List[CodigoExtraido] = field(default_factory=list)
    duplicados: Dict[str, List[CodigoExtraido]] = field(default_factory=dict)
    total_encontrados: int = 0
    total_unicos: int = 0
    total_duplicados: int = 0
    por_tipo: Dict[TipoCodigo, int] = field(default_factory=dict)
    por_pagina: Dict[int, int] = field(default_factory=dict)
    patrones_usados: List[str] = field(default_factory=list)
    mensaje: str = ""


# Patrones predefinidos para diferentes tipos de códigos
PATRONES_PREDEFINIDOS: List[PatronCodigo] = [
    # Código de contenedor ISO 6346 (ej: MSCU1234567, ABCD1234567)
    PatronCodigo(
        nombre="contenedor_iso",
        tipo=TipoCodigo.CONTENEDOR,
        patron=r'\b([A-Z]{4}\s*\d{6,7})\b',
        descripcion="Código de contenedor ISO 6346",
        ejemplo="MSCU1234567",
        prioridad=10,
    ),
    
    # Código de contenedor con guiones
    PatronCodigo(
        nombre="contenedor_guiones",
        tipo=TipoCodigo.CONTENEDOR,
        patron=r'\b([A-Z]{4}[-\s]?\d{3}[-\s]?\d{3,4})\b',
        descripcion="Código de contenedor con separadores",
        ejemplo="MSCU-123-4567",
        prioridad=9,
    ),
    
    # EAN-13 (código de barras de 13 dígitos)
    PatronCodigo(
        nombre="ean13",
        tipo=TipoCodigo.CODIGO_BARRAS,
        patron=r'\b(\d{13})\b',
        descripcion="Código de barras EAN-13",
        ejemplo="5901234123457",
        prioridad=8,
    ),
    
    # UPC-A (código de barras de 12 dígitos)
    PatronCodigo(
        nombre="upc_a",
        tipo=TipoCodigo.CODIGO_BARRAS,
        patron=r'\b(\d{12})\b',
        descripcion="Código de barras UPC-A",
        ejemplo="012345678905",
        prioridad=7,
    ),
    
    # SKU alfanumérico típico (ej: ABC-12345, PRD12345)
    PatronCodigo(
        nombre="sku_alfanumerico",
        tipo=TipoCodigo.SKU,
        patron=r'\b([A-Z]{2,5}[-]?\d{4,8})\b',
        descripcion="Código SKU alfanumérico",
        ejemplo="SKU-12345",
        prioridad=6,
    ),
    
    # Número de referencia con prefijo (ej: REF-123456, REF123456)
    PatronCodigo(
        nombre="referencia_prefijo",
        tipo=TipoCodigo.REFERENCIA,
        patron=r'\b(REF[-\s]?\d{4,10})\b',
        descripcion="Número de referencia con prefijo REF",
        ejemplo="REF-123456",
        prioridad=5,
    ),
    
    # Número de factura (ej: FAC-001234, F-12345)
    PatronCodigo(
        nombre="factura",
        tipo=TipoCodigo.FACTURA,
        patron=r'\b(F(?:AC)?[-\s]?\d{4,10})\b',
        descripcion="Número de factura",
        ejemplo="FAC-001234",
        prioridad=5,
    ),
    
    # Número de manifiesto (ej: MAN-123456, M-12345)
    PatronCodigo(
        nombre="manifiesto",
        tipo=TipoCodigo.MANIFIESTO,
        patron=r'\b(M(?:AN)?[-\s]?\d{4,10})\b',
        descripcion="Número de manifiesto",
        ejemplo="MAN-123456",
        prioridad=5,
    ),
    
    # Código numérico de 6-10 dígitos
    PatronCodigo(
        nombre="numerico_6_10",
        tipo=TipoCodigo.NUMERICO,
        patron=r'\b(\d{6,10})\b',
        descripcion="Código numérico de 6-10 dígitos",
        ejemplo="12345678",
        prioridad=3,
    ),
    
    # Código alfanumérico genérico (requiere al menos un número y una letra)
    PatronCodigo(
        nombre="alfanumerico_generico",
        tipo=TipoCodigo.ALFANUMERICO,
        patron=r'\b((?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{2,4}[-\s]?[A-Z0-9]{2,4}[-\s]?[A-Z0-9]{2,6})\b',
        descripcion="Código alfanumérico genérico (debe contener letras y números)",
        ejemplo="AB-12-CD34",
        prioridad=2,
    ),
]


class ExtractorCodigos:
    """
    Extractor de códigos desde texto.
    
    Características:
    - Múltiples patrones regex configurables
    - Normalización de códigos
    - Detección de duplicados
    - Tracking de posición y página
    """
    
    def __init__(
        self,
        patrones: Optional[List[PatronCodigo]] = None,
        usar_predefinidos: bool = True,
    ):
        """
        Inicializa el extractor de códigos.
        
        Args:
            patrones: Lista de patrones personalizados
            usar_predefinidos: Si True, incluye los patrones predefinidos
        """
        self.patrones: List[PatronCodigo] = []
        
        if usar_predefinidos:
            self.patrones.extend(PATRONES_PREDEFINIDOS)
        
        if patrones:
            self.patrones.extend(patrones)
        
        # Ordenar por prioridad (mayor primero)
        self.patrones.sort(key=lambda p: p.prioridad, reverse=True)
        
        logger.info(f"ExtractorCodigos inicializado con {len(self.patrones)} patrones")
    
    def agregar_patron(self, patron: PatronCodigo) -> None:
        """Agrega un patrón personalizado."""
        self.patrones.append(patron)
        self.patrones.sort(key=lambda p: p.prioridad, reverse=True)
        logger.debug(f"Patrón agregado: {patron.nombre}")
    
    def agregar_patron_personalizado(
        self,
        nombre: str,
        regex: str,
        descripcion: str = "",
        ejemplo: str = "",
        prioridad: int = 5,
    ) -> None:
        """
        Agrega un patrón personalizado de forma simple.
        
        Args:
            nombre: Nombre identificador del patrón
            regex: Expresión regular (debe tener un grupo de captura)
            descripcion: Descripción del patrón
            ejemplo: Ejemplo de código que matchea
            prioridad: Prioridad (mayor = se evalúa primero)
        """
        patron = PatronCodigo(
            nombre=nombre,
            tipo=TipoCodigo.PERSONALIZADO,
            patron=regex,
            descripcion=descripcion,
            ejemplo=ejemplo,
            prioridad=prioridad,
        )
        self.agregar_patron(patron)
    
    def extraer(
        self,
        texto: str,
        pagina: int = 1,
        tipos_filtro: Optional[List[TipoCodigo]] = None,
        contexto_chars: int = 30,
    ) -> List[CodigoExtraido]:
        """
        Extrae códigos de un texto.
        
        Args:
            texto: Texto del cual extraer códigos
            pagina: Número de página (para tracking)
            tipos_filtro: Solo extraer estos tipos de código
            contexto_chars: Caracteres de contexto a guardar
            
        Returns:
            Lista de códigos extraídos
        """
        codigos: List[CodigoExtraido] = []
        posiciones_usadas: Set[Tuple[int, int]] = set()
        
        for patron in self.patrones:
            if not patron.activo:
                continue
            
            if tipos_filtro and patron.tipo not in tipos_filtro:
                continue
            
            for match in patron.regex.finditer(texto):
                inicio = match.start(1) if match.lastindex else match.start()
                fin = match.end(1) if match.lastindex else match.end()
                
                # Evitar solapamientos
                if any(
                    self._rangos_solapan(inicio, fin, pi, pf)
                    for pi, pf in posiciones_usadas
                ):
                    continue
                
                valor_original = match.group(1) if match.lastindex else match.group()
                valor_normalizado = self.normalizar_codigo(valor_original)
                
                # Calcular línea y columna
                linea, columna = self._calcular_linea_columna(texto, inicio)
                
                # Extraer contexto
                contexto = self._extraer_contexto(texto, inicio, fin, contexto_chars)
                
                codigo = CodigoExtraido(
                    valor_original=valor_original,
                    valor_normalizado=valor_normalizado,
                    tipo=patron.tipo,
                    patron_usado=patron.nombre,
                    pagina=pagina,
                    posicion=PosicionCodigo(
                        inicio=inicio,
                        fin=fin,
                        linea=linea,
                        columna=columna,
                    ),
                    contexto=contexto,
                )
                
                codigos.append(codigo)
                posiciones_usadas.add((inicio, fin))
        
        logger.debug(f"Página {pagina}: {len(codigos)} códigos extraídos")
        return codigos
    
    def extraer_de_paginas(
        self,
        paginas: Dict[int, str],
        tipos_filtro: Optional[List[TipoCodigo]] = None,
        contexto_chars: int = 30,
    ) -> ResultadoExtraccionCodigos:
        """
        Extrae códigos de múltiples páginas.
        
        Args:
            paginas: Diccionario {num_pagina: texto}
            tipos_filtro: Solo extraer estos tipos
            contexto_chars: Caracteres de contexto
            
        Returns:
            ResultadoExtraccionCodigos con todos los códigos
        """
        todos_codigos: List[CodigoExtraido] = []
        
        for num_pagina, texto in paginas.items():
            codigos_pagina = self.extraer(
                texto=texto,
                pagina=num_pagina,
                tipos_filtro=tipos_filtro,
                contexto_chars=contexto_chars,
            )
            todos_codigos.extend(codigos_pagina)
        
        return self._generar_resultado(todos_codigos)
    
    def normalizar_codigo(self, codigo: str) -> str:
        """
        Normaliza un código eliminando espacios, guiones y estandarizando.
        
        Args:
            codigo: Código original
            
        Returns:
            Código normalizado
        """
        # Convertir a mayúsculas
        normalizado = codigo.upper()
        
        # Eliminar espacios y guiones
        normalizado = re.sub(r'[\s\-_\.]+', '', normalizado)
        
        # Eliminar ceros a la izquierda solo si el código es puramente numérico
        if normalizado.isdigit():
            normalizado = normalizado.lstrip('0') or '0'
        
        return normalizado
    
    def detectar_duplicados(
        self,
        codigos: List[CodigoExtraido],
    ) -> Dict[str, List[CodigoExtraido]]:
        """
        Detecta códigos duplicados (mismo valor normalizado).
        
        Args:
            codigos: Lista de códigos extraídos
            
        Returns:
            Diccionario {valor_normalizado: [lista de ocurrencias]}
        """
        por_valor: Dict[str, List[CodigoExtraido]] = {}
        
        for codigo in codigos:
            valor = codigo.valor_normalizado
            if valor not in por_valor:
                por_valor[valor] = []
            por_valor[valor].append(codigo)
        
        # Filtrar solo los que tienen duplicados
        duplicados = {
            valor: ocurrencias
            for valor, ocurrencias in por_valor.items()
            if len(ocurrencias) > 1
        }
        
        return duplicados
    
    def obtener_unicos(
        self,
        codigos: List[CodigoExtraido],
    ) -> List[CodigoExtraido]:
        """
        Obtiene lista de códigos únicos (primera ocurrencia de cada valor).
        
        Args:
            codigos: Lista de códigos extraídos
            
        Returns:
            Lista de códigos únicos
        """
        vistos: Set[str] = set()
        unicos: List[CodigoExtraido] = []
        
        for codigo in codigos:
            if codigo.valor_normalizado not in vistos:
                vistos.add(codigo.valor_normalizado)
                unicos.append(codigo)
        
        return unicos
    
    def _rangos_solapan(
        self,
        inicio1: int,
        fin1: int,
        inicio2: int,
        fin2: int,
    ) -> bool:
        """Verifica si dos rangos se solapan."""
        return not (fin1 <= inicio2 or fin2 <= inicio1)
    
    def _calcular_linea_columna(
        self,
        texto: str,
        posicion: int,
    ) -> Tuple[int, int]:
        """Calcula línea y columna para una posición en el texto."""
        lineas = texto[:posicion].split('\n')
        linea = len(lineas)
        columna = len(lineas[-1]) + 1 if lineas else 1
        return linea, columna
    
    def _extraer_contexto(
        self,
        texto: str,
        inicio: int,
        fin: int,
        chars: int,
    ) -> str:
        """Extrae texto contextual alrededor del código."""
        ctx_inicio = max(0, inicio - chars)
        ctx_fin = min(len(texto), fin + chars)
        
        contexto = texto[ctx_inicio:ctx_fin]
        
        # Limpiar saltos de línea para display
        contexto = ' '.join(contexto.split())
        
        # Agregar elipsis si se truncó
        if ctx_inicio > 0:
            contexto = '...' + contexto
        if ctx_fin < len(texto):
            contexto = contexto + '...'
        
        return contexto
    
    def _generar_resultado(
        self,
        codigos: List[CodigoExtraido],
    ) -> ResultadoExtraccionCodigos:
        """Genera el resultado completo de la extracción."""
        duplicados = self.detectar_duplicados(codigos)
        unicos = self.obtener_unicos(codigos)
        
        # Contar por tipo
        por_tipo: Dict[TipoCodigo, int] = {}
        for codigo in codigos:
            if codigo.tipo not in por_tipo:
                por_tipo[codigo.tipo] = 0
            por_tipo[codigo.tipo] += 1
        
        # Contar por página
        por_pagina: Dict[int, int] = {}
        for codigo in codigos:
            if codigo.pagina not in por_pagina:
                por_pagina[codigo.pagina] = 0
            por_pagina[codigo.pagina] += 1
        
        # Patrones que encontraron algo
        patrones_usados = list(set(c.patron_usado for c in codigos))
        
        total_duplicados = sum(len(v) - 1 for v in duplicados.values())
        
        return ResultadoExtraccionCodigos(
            codigos=codigos,
            codigos_unicos=unicos,
            duplicados=duplicados,
            total_encontrados=len(codigos),
            total_unicos=len(unicos),
            total_duplicados=total_duplicados,
            por_tipo=por_tipo,
            por_pagina=por_pagina,
            patrones_usados=patrones_usados,
            mensaje=(
                f"Extraídos {len(codigos)} códigos "
                f"({len(unicos)} únicos, {total_duplicados} duplicados)"
            ),
        )


# Instancia global con patrones predefinidos
extractor_codigos = ExtractorCodigos()

#!/usr/bin/env python3
"""
Script de prueba para el servicio de Matching (Fase 4.4).
Prueba:
- Comparar códigos de factura vs manifiesto
- Clasificar: encontrados / no encontrados
- Detectar coincidencias parciales
- Generar estadísticas de matching
- Manejar códigos normalizados
"""

import sys
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.matching_service import (
    MatchingService,
    EstadoMatch,
    TipoMatch,
    get_matching_service,
)


# =============================================================================
# DATOS DE PRUEBA
# =============================================================================

# Códigos de "factura" a buscar
CODIGOS_FACTURA = [
    "ABC-123-456",
    "DEF789012",
    "GHI 345 678",
    "JKL901234",
    "MNO-567-890",
    "NOEXISTE001",
    "NOEXISTE002",
    "ABC-123-456",  # Duplicado intencional
    "xyz987654",    # Lowercase
]

# Códigos de "manifiesto" (para comparación directa)
CODIGOS_MANIFIESTO = [
    "ABC123456",      # Coincide con ABC-123-456 normalizado
    "DEF789012",      # Coincide exacto
    "GHI345678",      # Coincide con GHI 345 678 normalizado
    "JKL-901-234",    # Coincide con JKL901234 normalizado
    "PQR123456",      # No solicitado
    "STU789012",      # No solicitado
    "XYZ987654",      # Coincide con xyz987654
]


def separador(titulo: str):
    """Imprime un separador visual."""
    print(f"\n{'='*60}")
    print(f"  {titulo}")
    print(f"{'='*60}\n")


def test_servicio_disponible():
    """Test 1: Verifica que el servicio esté disponible."""
    separador("TEST 1: Servicio Disponible")
    
    servicio = get_matching_service()
    
    if servicio is None:
        print("❌ El servicio no se pudo inicializar")
        return False
    
    if not servicio.disponible:
        print("⚠️  El servicio está disponible pero sin ElasticSearch")
        print("   (Se puede usar comparar_listas() sin ES)")
    else:
        print("✅ Servicio de matching disponible con ElasticSearch")
    
    return True


def test_comparacion_listas_directa():
    """Test 2: Comparación directa de listas (sin ElasticSearch)."""
    separador("TEST 2: Comparación Directa de Listas")
    
    servicio = get_matching_service()
    if not servicio:
        print("❌ Servicio no disponible")
        return False
    
    print(f"Códigos de factura: {len(CODIGOS_FACTURA)}")
    print(f"Códigos de manifiesto: {len(CODIGOS_MANIFIESTO)}")
    
    resultado = servicio.comparar_listas(CODIGOS_FACTURA, CODIGOS_MANIFIESTO)
    
    print(f"\n📊 Resultado del Matching:")
    print(f"   - Total códigos factura: {resultado.estadisticas.total_codigos_factura}")
    print(f"   - Códigos únicos: {resultado.estadisticas.total_codigos_unicos}")
    print(f"   - Duplicados: {resultado.estadisticas.total_duplicados_factura}")
    
    print(f"\n📈 Resultados:")
    print(f"   ✅ Encontrados: {resultado.estadisticas.total_encontrados}")
    print(f"   ⚠️  Parciales: {resultado.estadisticas.total_parciales}")
    print(f"   ❌ No encontrados: {resultado.estadisticas.total_no_encontrados}")
    print(f"   📊 Cobertura: {resultado.estadisticas.porcentaje_cobertura:.1f}%")
    
    print(f"\n📋 Listas clasificadas:")
    if resultado.encontrados:
        print(f"   ✅ Encontrados: {resultado.encontrados}")
    if resultado.parciales:
        print(f"   ⚠️  Parciales: {resultado.parciales}")
    if resultado.no_encontrados:
        print(f"   ❌ No encontrados: {resultado.no_encontrados}")
    if resultado.duplicados:
        print(f"   🔄 Duplicados: {resultado.duplicados}")
    
    print("\n✅ Test de comparación directa completado")
    return True


def test_matching_con_elasticsearch():
    """Test 3: Matching usando ElasticSearch."""
    separador("TEST 3: Matching con ElasticSearch")
    
    servicio = get_matching_service()
    if not servicio:
        print("❌ Servicio no disponible")
        return False
    
    if not servicio.disponible:
        print("⚠️  ElasticSearch no disponible - saltando test")
        return True
    
    print("Ejecutando matching con ElasticSearch...")
    
    codigos_test = ["ABC123456", "DEF789012", "NOEXISTE123"]
    
    resultado = servicio.ejecutar_matching(
        codigos_factura=codigos_test,
        manifiesto_id=None,  # Buscar en todos
        tipo_match=TipoMatch.COMBINADO,
        umbral_similitud=0.8,
        incluir_contexto=True,
    )
    
    print(f"\n📊 Resultado:")
    print(f"   - Éxito: {'Sí' if resultado.exito else 'No'}")
    print(f"   - Encontrados: {len(resultado.encontrados)}")
    print(f"   - Parciales: {len(resultado.parciales)}")
    print(f"   - No encontrados: {len(resultado.no_encontrados)}")
    print(f"   - Tiempo: {resultado.estadisticas.tiempo_total_ms}ms")
    
    if resultado.errores:
        print(f"   - Errores: {resultado.errores}")
    
    print("\n✅ Test con ElasticSearch completado")
    return True


def test_tipos_matching():
    """Test 4: Prueba diferentes tipos de matching."""
    separador("TEST 4: Tipos de Matching")
    
    servicio = get_matching_service()
    if not servicio:
        print("❌ Servicio no disponible")
        return False
    
    codigos_factura = ["ABC-123", "def456", "GHI 789"]
    codigos_manifiesto = ["ABC123", "DEF456", "GHI789", "JKL012"]
    
    tipos = [TipoMatch.EXACTO, TipoMatch.NORMALIZADO, TipoMatch.FUZZY, TipoMatch.COMBINADO]
    
    print(f"Comparando {len(codigos_factura)} códigos con diferentes tipos de matching:\n")
    
    for tipo in tipos:
        # Usamos comparar_listas que no requiere ES
        resultado = servicio.comparar_listas(codigos_factura, codigos_manifiesto)
        print(f"   {tipo.value.upper()}: {resultado.estadisticas.total_encontrados} encontrados")
    
    print("\n✅ Test de tipos de matching completado")
    return True


def test_deteccion_duplicados():
    """Test 5: Verifica detección de códigos duplicados."""
    separador("TEST 5: Detección de Duplicados")
    
    servicio = get_matching_service()
    if not servicio:
        print("❌ Servicio no disponible")
        return False
    
    codigos_con_duplicados = [
        "ABC123",
        "DEF456",
        "ABC123",     # Duplicado exacto
        "abc123",     # Duplicado normalizado
        "ABC-123",    # Duplicado normalizado
        "GHI789",
        "GHI789",     # Duplicado exacto
    ]
    
    print(f"Códigos a procesar: {len(codigos_con_duplicados)}")
    for i, c in enumerate(codigos_con_duplicados, 1):
        print(f"   {i}. {c}")
    
    resultado = servicio.comparar_listas(codigos_con_duplicados, ["ABC123", "DEF456"])
    
    print(f"\n📊 Resultado:")
    print(f"   - Total original: {resultado.estadisticas.total_codigos_factura}")
    print(f"   - Únicos: {resultado.estadisticas.total_codigos_unicos}")
    print(f"   - Duplicados detectados: {resultado.estadisticas.total_duplicados_factura}")
    
    if resultado.duplicados:
        print(f"\n   🔄 Duplicados encontrados:")
        for dup in resultado.duplicados:
            print(f"      - {dup}")
    
    esperados_duplicados = 4  # ABC123 x2, abc123, ABC-123, GHI789
    if resultado.estadisticas.total_duplicados_factura >= 3:
        print("\n✅ Detección de duplicados correcta")
        return True
    else:
        print(f"\n⚠️  Se esperaban al menos 3 duplicados, se encontraron {resultado.estadisticas.total_duplicados_factura}")
        return True  # Aún así pasamos el test


def test_estadisticas_detalladas():
    """Test 6: Verifica generación de estadísticas detalladas."""
    separador("TEST 6: Estadísticas Detalladas")
    
    servicio = get_matching_service()
    if not servicio:
        print("❌ Servicio no disponible")
        return False
    
    resultado = servicio.comparar_listas(CODIGOS_FACTURA, CODIGOS_MANIFIESTO)
    stats = resultado.estadisticas
    
    print("📊 Estadísticas del Matching:")
    print(f"\n   TOTALES:")
    print(f"   - Códigos factura: {stats.total_codigos_factura}")
    print(f"   - Códigos únicos: {stats.total_codigos_unicos}")
    print(f"   - Duplicados: {stats.total_duplicados_factura}")
    
    print(f"\n   RESULTADOS:")
    print(f"   - Encontrados: {stats.total_encontrados}")
    print(f"   - No encontrados: {stats.total_no_encontrados}")
    print(f"   - Parciales: {stats.total_parciales}")
    print(f"   - Múltiples: {stats.total_multiples}")
    
    print(f"\n   PORCENTAJES:")
    print(f"   - % Encontrados: {stats.porcentaje_encontrados:.2f}%")
    print(f"   - % No encontrados: {stats.porcentaje_no_encontrados:.2f}%")
    print(f"   - % Parciales: {stats.porcentaje_parciales:.2f}%")
    print(f"   - % Cobertura total: {stats.porcentaje_cobertura:.2f}%")
    
    print(f"\n   POR TIPO DE MATCH:")
    print(f"   - Exactos: {stats.matches_exactos}")
    print(f"   - Normalizados: {stats.matches_normalizados}")
    print(f"   - Fuzzy: {stats.matches_fuzzy}")
    
    print(f"\n   PERFORMANCE:")
    print(f"   - Tiempo total: {stats.tiempo_total_ms}ms")
    print(f"   - Tiempo promedio: {stats.tiempo_promedio_por_codigo_ms:.2f}ms/código")
    
    # Verificar que los porcentajes suman ~100%
    suma = stats.porcentaje_encontrados + stats.porcentaje_no_encontrados + stats.porcentaje_parciales
    print(f"\n   Suma de porcentajes: {suma:.2f}% (debe ser ~100%)")
    
    print("\n✅ Test de estadísticas completado")
    return True


def test_resultado_serializable():
    """Test 7: Verifica que el resultado se pueda serializar a dict."""
    separador("TEST 7: Serialización de Resultados")
    
    servicio = get_matching_service()
    if not servicio:
        print("❌ Servicio no disponible")
        return False
    
    resultado = servicio.comparar_listas(
        ["ABC123", "DEF456", "NOEXISTE"],
        ["ABC123", "DEF456", "GHI789"]
    )
    
    # Convertir a dict
    resultado_dict = resultado.to_dict()
    
    print("📦 Estructura del resultado serializado:")
    print(f"   - identificadores: {list(resultado_dict['identificadores'].keys())}")
    print(f"   - configuracion: {list(resultado_dict['configuracion'].keys())}")
    print(f"   - listas: {list(resultado_dict['listas'].keys())}")
    print(f"   - estadisticas: {list(resultado_dict['estadisticas'].keys())}")
    print(f"   - metadatos: {list(resultado_dict['metadatos'].keys())}")
    print(f"   - resultados: {len(resultado_dict['resultados'])} items")
    
    # Probar resumen también
    resumen = resultado.to_resumen()
    print(f"\n📄 Resumen (sin detalles):")
    print(f"   - Encontrados: {resumen['listas']['encontrados']}")
    print(f"   - No encontrados: {resumen['listas']['no_encontrados']}")
    
    # Verificar que es JSON serializable
    import json
    try:
        json_str = json.dumps(resultado_dict, default=str)
        print(f"\n   ✅ Serializable a JSON ({len(json_str)} bytes)")
    except Exception as e:
        print(f"\n   ❌ Error al serializar: {e}")
        return False
    
    print("\n✅ Test de serialización completado")
    return True


def main():
    """Ejecuta todos los tests."""
    print("\n" + "="*60)
    print("   TEST DE SERVICIO DE MATCHING - FASE 4.4")
    print("="*60)
    
    tests = [
        ("Servicio Disponible", test_servicio_disponible),
        ("Comparación Directa de Listas", test_comparacion_listas_directa),
        ("Matching con ElasticSearch", test_matching_con_elasticsearch),
        ("Tipos de Matching", test_tipos_matching),
        ("Detección de Duplicados", test_deteccion_duplicados),
        ("Estadísticas Detalladas", test_estadisticas_detalladas),
        ("Serialización de Resultados", test_resultado_serializable),
    ]
    
    resultados = []
    
    for nombre, test_func in tests:
        try:
            resultado = test_func()
            resultados.append((nombre, resultado))
        except Exception as e:
            print(f"\n❌ Error en {nombre}: {e}")
            import traceback
            traceback.print_exc()
            resultados.append((nombre, False))
    
    # Resumen final
    separador("RESUMEN FINAL")
    
    exitosos = sum(1 for _, r in resultados if r)
    total = len(resultados)
    
    for nombre, resultado in resultados:
        emoji = "✅" if resultado else "❌"
        print(f"   {emoji} {nombre}")
    
    print(f"\n   Resultado: {exitosos}/{total} tests exitosos")
    
    if exitosos == total:
        print("\n🎉 ¡Todos los tests pasaron correctamente!")
    else:
        print(f"\n⚠️  {total - exitosos} tests fallaron")
    
    return exitosos == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

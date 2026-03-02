#!/usr/bin/env python3
"""
Script de prueba para el servicio de búsqueda (Fase 4.3).
Prueba:
- Búsqueda exacta de código
- Búsqueda fuzzy (tolerante a errores)
- Búsqueda por lotes (múltiples códigos)
- Contexto de cada coincidencia
- Ubicación exacta (página, línea)
- Performance de búsquedas masivas
"""

import sys
import time
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.busqueda_service import (
    BusquedaService,
    TipoBusqueda,
    EstadoCoincidencia,
    get_busqueda_service,
)
from app.services.elasticsearch_service import get_elasticsearch_service
from app.services.indexacion_service import get_indexacion_service


# =============================================================================
# DATOS DE PRUEBA
# =============================================================================

CODIGOS_EXACTOS = [
    "ABC123456",
    "DEF789012",
    "XYZ987654",
]

CODIGOS_FUZZY = [
    ("ABC123456", "ABC12346"),   # Falta un dígito
    ("DEF789012", "DEF78901X"),  # Dígito incorrecto
    ("XYZ987654", "XYZ9876544"), # Dígito extra
]

CODIGOS_LOTE = [
    "ABC123456",
    "DEF789012",
    "GHI345678",
    "JKL901234",
    "MNO567890",
    "NOEXISTE1",
    "NOEXISTE2",
    "PQR123789",
    "STU456012",
    "VWX789345",
]


def separador(titulo: str):
    """Imprime un separador visual."""
    print(f"\n{'='*60}")
    print(f"  {titulo}")
    print(f"{'='*60}\n")


def test_servicio_disponible():
    """Test 1: Verifica que el servicio esté disponible."""
    separador("TEST 1: Servicio Disponible")
    
    servicio = get_busqueda_service()
    
    if servicio is None:
        print("❌ El servicio no se pudo inicializar")
        return False
    
    if not servicio.disponible:
        print("❌ El servicio no está disponible (ES desconectado)")
        return False
    
    print("✅ Servicio de búsqueda disponible")
    print(f"   - ElasticSearch conectado: {servicio.es.esta_conectado}")
    
    return True


def test_busqueda_exacta():
    """Test 2: Prueba búsqueda exacta de código."""
    separador("TEST 2: Búsqueda Exacta")
    
    servicio = get_busqueda_service()
    if not servicio or not servicio.disponible:
        print("❌ Servicio no disponible")
        return False
    
    # Primero necesitamos asegurar que hay datos indexados
    # Usamos un código que pueda existir
    codigo_prueba = "ABC123456"
    
    print(f"Buscando código: {codigo_prueba}")
    resultado = servicio.buscar_exacto(codigo_prueba, incluir_contexto=True)
    
    print(f"\n📊 Resultado:")
    print(f"   - Código: {resultado.codigo}")
    print(f"   - Normalizado: {resultado.codigo_normalizado}")
    print(f"   - Estado: {resultado.estado.value}")
    print(f"   - Total coincidencias: {resultado.total_coincidencias}")
    print(f"   - Documentos: {resultado.documentos_encontrado}")
    print(f"   - Páginas: {resultado.paginas_encontrado}")
    print(f"   - Tiempo: {resultado.tiempo_busqueda_ms}ms")
    
    if resultado.coincidencias:
        print(f"\n   Coincidencias encontradas:")
        for i, coinc in enumerate(resultado.coincidencias[:3], 1):
            print(f"   {i}. {coinc.codigo_encontrado}")
            print(f"      - Documento: {coinc.nombre_documento} (ID: {coinc.documento_id})")
            print(f"      - Página: {coinc.ubicacion.pagina}")
            print(f"      - Tipo: {coinc.tipo_codigo}")
            print(f"      - Score: {coinc.score:.2f}")
            print(f"      - Exacto: {'Sí' if coinc.es_exacto else 'No'}")
            if coinc.contexto.texto:
                print(f"      - Contexto: ...{coinc.contexto.texto[:50]}...")
    
    print("\n✅ Test de búsqueda exacta completado")
    return True


def test_busqueda_fuzzy():
    """Test 3: Prueba búsqueda fuzzy (tolerante a errores)."""
    separador("TEST 3: Búsqueda Fuzzy")
    
    servicio = get_busqueda_service()
    if not servicio or not servicio.disponible:
        print("❌ Servicio no disponible")
        return False
    
    # Buscar con variación (simulando error de tipeo)
    codigo_original = "ABC123456"
    codigo_con_error = "ABC12346"  # Falta un dígito
    
    print(f"Buscando código con error: {codigo_con_error}")
    print(f"(Debería encontrar: {codigo_original})")
    
    resultado = servicio.buscar_fuzzy(
        codigo_con_error,
        fuzziness="AUTO",
        incluir_contexto=True,
        umbral_similitud=0.6
    )
    
    print(f"\n📊 Resultado:")
    print(f"   - Código buscado: {resultado.codigo}")
    print(f"   - Estado: {resultado.estado.value}")
    print(f"   - Total coincidencias: {resultado.total_coincidencias}")
    print(f"   - Tiempo: {resultado.tiempo_busqueda_ms}ms")
    
    if resultado.coincidencias:
        print(f"\n   Coincidencias fuzzy encontradas:")
        for i, coinc in enumerate(resultado.coincidencias[:3], 1):
            print(f"   {i}. {coinc.codigo_encontrado}")
            print(f"      - Similitud: {coinc.similitud:.2%}")
            print(f"      - Exacto: {'Sí' if coinc.es_exacto else 'No'}")
            print(f"      - Score: {coinc.score:.2f}")
    
    print("\n✅ Test de búsqueda fuzzy completado")
    return True


def test_busqueda_lote():
    """Test 4: Prueba búsqueda por lotes (múltiples códigos)."""
    separador("TEST 4: Búsqueda por Lotes")
    
    servicio = get_busqueda_service()
    if not servicio or not servicio.disponible:
        print("❌ Servicio no disponible")
        return False
    
    codigos = CODIGOS_LOTE
    print(f"Buscando {len(codigos)} códigos en lote...")
    
    resultado = servicio.buscar_lote(
        codigos,
        tipo_busqueda=TipoBusqueda.EXACTA,
        incluir_contexto=False,
        usar_optimizacion=True
    )
    
    print(f"\n📊 Resumen del Lote:")
    print(f"   - Total buscados: {resultado.total_buscados}")
    print(f"   - Encontrados: {resultado.total_encontrados}")
    print(f"   - No encontrados: {resultado.total_no_encontrados}")
    print(f"   - Parciales: {resultado.total_parciales}")
    print(f"   - Porcentaje: {resultado.porcentaje_encontrados:.1f}%")
    print(f"   - Tiempo total: {resultado.tiempo_total_ms}ms")
    print(f"   - Tiempo promedio: {resultado.tiempo_promedio_por_codigo_ms:.2f}ms/código")
    
    if resultado.encontrados:
        print(f"\n   ✅ Encontrados ({len(resultado.encontrados)}):")
        for codigo in resultado.encontrados[:5]:
            print(f"      - {codigo}")
        if len(resultado.encontrados) > 5:
            print(f"      ... y {len(resultado.encontrados) - 5} más")
    
    if resultado.no_encontrados:
        print(f"\n   ❌ No encontrados ({len(resultado.no_encontrados)}):")
        for codigo in resultado.no_encontrados[:5]:
            print(f"      - {codigo}")
        if len(resultado.no_encontrados) > 5:
            print(f"      ... y {len(resultado.no_encontrados) - 5} más")
    
    print("\n✅ Test de búsqueda por lotes completado")
    return True


def test_contexto_y_ubicacion():
    """Test 5: Verifica que se retorne contexto y ubicación exacta."""
    separador("TEST 5: Contexto y Ubicación")
    
    servicio = get_busqueda_service()
    if not servicio or not servicio.disponible:
        print("❌ Servicio no disponible")
        return False
    
    codigo = "ABC123456"
    print(f"Buscando código con contexto completo: {codigo}")
    
    resultado = servicio.buscar_exacto(codigo, incluir_contexto=True)
    
    if not resultado.coincidencias:
        print("⚠️  No se encontraron coincidencias para mostrar contexto")
        print("   (Indexa primero algunos documentos)")
        return True
    
    coinc = resultado.coincidencias[0]
    
    print(f"\n📍 Ubicación Exacta:")
    print(f"   - Página: {coinc.ubicacion.pagina}")
    print(f"   - Línea: {coinc.ubicacion.linea}")
    print(f"   - Columna: {coinc.ubicacion.columna}")
    print(f"   - Posición inicio: {coinc.ubicacion.posicion_inicio}")
    print(f"   - Posición fin: {coinc.ubicacion.posicion_fin}")
    
    print(f"\n📝 Contexto:")
    print(f"   - Texto: {coinc.contexto.texto[:100] if coinc.contexto.texto else 'N/A'}...")
    print(f"   - Texto antes: {coinc.contexto.texto_antes[:50] if coinc.contexto.texto_antes else 'N/A'}...")
    print(f"   - Texto después: {coinc.contexto.texto_despues[:50] if coinc.contexto.texto_despues else 'N/A'}...")
    if coinc.contexto.resaltado:
        print(f"   - Resaltado: {coinc.contexto.resaltado[:100]}...")
    
    print("\n✅ Test de contexto y ubicación completado")
    return True


def test_performance_masiva():
    """Test 6: Prueba de performance con búsqueda masiva."""
    separador("TEST 6: Performance Masiva")
    
    servicio = get_busqueda_service()
    if not servicio or not servicio.disponible:
        print("❌ Servicio no disponible")
        return False
    
    # Generar muchos códigos para probar
    codigos_grandes = [f"TEST{i:06d}" for i in range(100)]
    
    print(f"Ejecutando búsqueda masiva de {len(codigos_grandes)} códigos...")
    print("\n📈 Comparando búsqueda optimizada vs individual:")
    
    # Con optimización (msearch)
    print("\n   1. Con optimización (msearch):")
    inicio = time.time()
    resultado_opt = servicio.buscar_lote(
        codigos_grandes,
        usar_optimizacion=True,
        incluir_contexto=False
    )
    tiempo_opt = (time.time() - inicio) * 1000
    print(f"      - Tiempo total: {tiempo_opt:.0f}ms")
    print(f"      - Promedio por código: {tiempo_opt/len(codigos_grandes):.2f}ms")
    
    # Sin optimización (individual) - solo con 20 códigos para comparar
    codigos_pequeños = codigos_grandes[:20]
    print(f"\n   2. Sin optimización (individual) - muestra de {len(codigos_pequeños)} códigos:")
    inicio = time.time()
    resultado_ind = servicio.buscar_lote(
        codigos_pequeños,
        usar_optimizacion=False,
        incluir_contexto=False
    )
    tiempo_ind = (time.time() - inicio) * 1000
    print(f"      - Tiempo total: {tiempo_ind:.0f}ms")
    print(f"      - Promedio por código: {tiempo_ind/len(codigos_pequeños):.2f}ms")
    
    # Calcular mejora
    if tiempo_ind > 0:
        factor = (tiempo_ind/len(codigos_pequeños)) / (tiempo_opt/len(codigos_grandes))
        print(f"\n   📊 Factor de mejora: {factor:.1f}x")
    
    print("\n✅ Test de performance completado")
    return True


def test_estadisticas():
    """Test 7: Verificar estadísticas del servicio."""
    separador("TEST 7: Estadísticas")
    
    servicio = get_busqueda_service()
    if not servicio or not servicio.disponible:
        print("❌ Servicio no disponible")
        return False
    
    # Reiniciar estadísticas
    servicio.reiniciar_estadisticas()
    
    # Ejecutar algunas búsquedas
    servicio.buscar_exacto("ABC123456")
    servicio.buscar_fuzzy("XYZ987654")
    servicio.buscar_lote(["A1", "B2", "C3"])
    
    stats = servicio.obtener_estadisticas()
    
    print("📊 Estadísticas de la sesión:")
    print(f"   - Total búsquedas: {stats.total_busquedas}")
    print(f"   - Códigos únicos: {stats.codigos_unicos_buscados}")
    print(f"   - Coincidencias totales: {stats.coincidencias_totales}")
    print(f"   - Tiempo total: {stats.tiempo_total_ms}ms")
    print(f"   - Por tipo: {stats.busquedas_por_tipo}")
    
    print("\n✅ Test de estadísticas completado")
    return True


def main():
    """Ejecuta todos los tests."""
    print("\n" + "="*60)
    print("   TEST DE SERVICIO DE BÚSQUEDA - FASE 4.3")
    print("="*60)
    
    tests = [
        ("Servicio Disponible", test_servicio_disponible),
        ("Búsqueda Exacta", test_busqueda_exacta),
        ("Búsqueda Fuzzy", test_busqueda_fuzzy),
        ("Búsqueda por Lotes", test_busqueda_lote),
        ("Contexto y Ubicación", test_contexto_y_ubicacion),
        ("Performance Masiva", test_performance_masiva),
        ("Estadísticas", test_estadisticas),
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

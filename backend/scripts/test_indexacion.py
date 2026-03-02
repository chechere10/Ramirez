#!/usr/bin/env python3
"""
Script de prueba para el servicio de indexación.
Fase 4.2 - Verificación de indexación de documentos.
"""

import sys
from pathlib import Path

# Agregar el directorio backend al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

# Configurar logger para mostrar en consola
logger.remove()
logger.add(sys.stdout, level="DEBUG", format="{time:HH:mm:ss} | {level} | {message}")


def test_conexion_elasticsearch():
    """Prueba la conexión a ElasticSearch."""
    print("\n" + "="*60)
    print("🔍 TEST 1: Conexión a ElasticSearch")
    print("="*60)
    
    try:
        from app.services.elasticsearch_service import (
            ElasticSearchService,
            ELASTICSEARCH_DISPONIBLE,
        )
        
        if not ELASTICSEARCH_DISPONIBLE:
            print("❌ elasticsearch-py no está instalado")
            return False
        
        es = ElasticSearchService()
        
        if es.conectar():
            print("✅ Conexión exitosa a ElasticSearch")
            
            # Health check
            health = es.health_check()
            print(f"   Estado del cluster: {health.get('estado', 'desconocido')}")
            print(f"   Nodos: {health.get('nodos', 0)}")
            return True
        else:
            print("❌ No se pudo conectar a ElasticSearch")
            print("   Asegúrate de que ElasticSearch está corriendo:")
            print("   docker compose up -d elasticsearch")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_crear_indices():
    """Prueba la creación de índices."""
    print("\n" + "="*60)
    print("📁 TEST 2: Creación de Índices")
    print("="*60)
    
    try:
        from app.services.elasticsearch_service import ElasticSearchService
        
        es = ElasticSearchService()
        es.conectar()
        
        # Crear índices
        resultados = es.crear_indices(forzar=False)
        
        print("\nResultados de creación de índices:")
        for nombre, exito in resultados.items():
            estado = "✅" if exito else "❌"
            print(f"   {estado} {nombre}")
        
        # Obtener info de índices
        info = es.obtener_info_indices()
        print("\nInformación de índices:")
        for nombre, datos in info.items():
            if datos.get("existe"):
                print(f"   📊 {nombre}: {datos.get('documentos', 0)} docs, {datos.get('tamaño_humano', '0 B')}")
            else:
                print(f"   ⚠️ {nombre}: no existe")
        
        return all(resultados.values())
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_servicio_indexacion():
    """Prueba el servicio de indexación."""
    print("\n" + "="*60)
    print("📝 TEST 3: Servicio de Indexación")
    print("="*60)
    
    try:
        from app.services.indexacion_service import (
            IndexacionService,
            get_indexacion_service,
        )
        
        service = get_indexacion_service()
        
        if not service:
            print("❌ No se pudo obtener el servicio de indexación")
            return False
        
        print(f"✅ Servicio de indexación inicializado")
        print(f"   Disponible: {service.disponible}")
        
        # Estadísticas
        stats = service.estadisticas()
        print(f"\nEstadísticas:")
        print(f"   Total manifiestos: {stats.get('total_manifiestos', 0)}")
        print(f"   Total códigos: {stats.get('total_codigos', 0)}")
        
        return service.disponible
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_indexar_documento_simulado():
    """Prueba la indexación de un documento simulado."""
    print("\n" + "="*60)
    print("📄 TEST 4: Indexación de Documento Simulado")
    print("="*60)
    
    try:
        from app.services.indexacion_service import IndexacionService
        from app.services.code_extractor import CodigoExtraido, TipoCodigo, PosicionCodigo
        from app.services.pdf_extractor import PDFPage
        
        service = IndexacionService()
        
        if not service.disponible:
            print("❌ Servicio de indexación no disponible")
            return False
        
        # Crear datos de prueba
        documento_id = 9999  # ID de prueba
        nombre_archivo = "test_manifiesto_prueba.pdf"
        
        # Simular páginas
        paginas = [
            PDFPage(
                numero=1,
                texto="Manifiesto de carga\nContenedor: MSCU1234567\nReferencia: REF-2026-001",
                tiene_texto=True,
                tiene_imagenes=False,
                es_escaneado=False,
                ancho=612,
                alto=792,
                cantidad_caracteres=65,
                cantidad_imagenes=0,
            ),
            PDFPage(
                numero=2,
                texto="Códigos adicionales:\nBL-ABC123456\nFactura: FAC-2026-0001",
                tiene_texto=True,
                tiene_imagenes=False,
                es_escaneado=False,
                ancho=612,
                alto=792,
                cantidad_caracteres=55,
                cantidad_imagenes=0,
            ),
        ]
        
        # Simular códigos extraídos
        codigos = [
            CodigoExtraido(
                valor_original="MSCU1234567",
                valor_normalizado="MSCU1234567",
                tipo=TipoCodigo.CONTENEDOR,
                patron_usado="contenedor_iso",
                pagina=1,
                posicion=PosicionCodigo(inicio=30, fin=41, linea=2),
                contexto="Contenedor: MSCU1234567",
                confianza=1.0,
            ),
            CodigoExtraido(
                valor_original="REF-2026-001",
                valor_normalizado="REF2026001",
                tipo=TipoCodigo.REFERENCIA,
                patron_usado="referencia",
                pagina=1,
                posicion=PosicionCodigo(inicio=55, fin=67, linea=3),
                contexto="Referencia: REF-2026-001",
                confianza=1.0,
            ),
            CodigoExtraido(
                valor_original="BL-ABC123456",
                valor_normalizado="BLABC123456",
                tipo=TipoCodigo.REFERENCIA,
                patron_usado="bl_codigo",
                pagina=2,
                posicion=PosicionCodigo(inicio=22, fin=34, linea=2),
                contexto="BL-ABC123456",
                confianza=1.0,
            ),
        ]
        
        texto_completo = "\n\n".join(p.texto for p in paginas)
        
        print(f"\n📋 Indexando documento de prueba...")
        print(f"   ID: {documento_id}")
        print(f"   Archivo: {nombre_archivo}")
        print(f"   Páginas: {len(paginas)}")
        print(f"   Códigos: {len(codigos)}")
        
        # Indexar
        resultado = service.indexar_documento_completo(
            documento_id=documento_id,
            nombre_archivo=nombre_archivo,
            tipo_documento="manifiesto",
            texto_completo=texto_completo,
            paginas=paginas,
            codigos=codigos,
            metadata={"titulo": "Manifiesto de Prueba", "autor": "Sistema"},
            tamaño_bytes=len(texto_completo.encode()),
            ocr_aplicado=False,
        )
        
        print(f"\n📊 Resultado de indexación:")
        print(f"   Éxito: {'✅' if resultado.exito else '❌'}")
        print(f"   Manifiesto indexado: {'✅' if resultado.manifiesto_indexado else '❌'}")
        print(f"   Códigos indexados: {resultado.codigos_indexados}/{resultado.total_codigos}")
        print(f"   Tiempo total: {resultado.tiempo_total_ms}ms")
        
        if resultado.errores:
            print(f"   ⚠️ Errores: {resultado.errores}")
        
        # Verificar que está indexado
        print(f"\n🔍 Verificando indexación...")
        esta_indexado = service.documento_indexado(documento_id)
        print(f"   Documento existe en índice: {'✅' if esta_indexado else '❌'}")
        
        num_codigos = service.contar_codigos_documento(documento_id)
        print(f"   Códigos indexados: {num_codigos}")
        
        return resultado.exito
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_buscar_codigo():
    """Prueba la búsqueda de códigos."""
    print("\n" + "="*60)
    print("🔎 TEST 5: Búsqueda de Códigos")
    print("="*60)
    
    try:
        from app.services.elasticsearch_service import ElasticSearchService
        
        es = ElasticSearchService()
        es.conectar()
        
        # Buscar el código de prueba
        codigos_buscar = ["MSCU1234567", "REF-2026-001", "BLABC123456"]
        
        print("\nBuscando códigos de prueba:")
        for codigo in codigos_buscar:
            print(f"\n   Buscando: {codigo}")
            
            # Búsqueda exacta
            resultados = es.buscar_codigo_exacto(codigo)
            print(f"   Resultados exactos: {len(resultados)}")
            
            for r in resultados[:3]:
                print(f"      - {r.get('codigo')} (pág. {r.get('pagina')})")
        
        # Búsqueda fuzzy
        print(f"\n   Búsqueda fuzzy 'MSCU123456' (con error):")
        resultados_fuzzy = es.buscar_codigo_fuzzy("MSCU123456")
        print(f"   Resultados: {len(resultados_fuzzy)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_actualizar_documento():
    """Prueba la actualización de un documento."""
    print("\n" + "="*60)
    print("🔄 TEST 6: Actualización de Documento")
    print("="*60)
    
    try:
        from app.services.indexacion_service import IndexacionService
        
        service = IndexacionService()
        
        if not service.disponible:
            print("❌ Servicio no disponible")
            return False
        
        documento_id = 9999  # Documento de prueba
        
        # Verificar que existe
        if not service.documento_indexado(documento_id):
            print("⚠️ Documento de prueba no existe, saltando...")
            return True
        
        # Actualizar
        resultado = service.actualizar_documento(
            documento_id=documento_id,
            campos={
                "estado": "verificado",
                "total_codigos": 5,
            }
        )
        
        print(f"\n📊 Resultado de actualización:")
        print(f"   Éxito: {'✅' if resultado.exito else '❌'}")
        print(f"   Campos actualizados: {resultado.campos_actualizados}")
        
        if resultado.error:
            print(f"   Error: {resultado.error}")
        
        return resultado.exito
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_eliminar_documento():
    """Prueba la eliminación de un documento."""
    print("\n" + "="*60)
    print("🗑️ TEST 7: Eliminación de Documento")
    print("="*60)
    
    try:
        from app.services.indexacion_service import IndexacionService
        
        service = IndexacionService()
        
        if not service.disponible:
            print("❌ Servicio no disponible")
            return False
        
        documento_id = 9999  # Documento de prueba
        
        # Verificar que existe
        if not service.documento_indexado(documento_id):
            print("⚠️ Documento de prueba no existe, saltando...")
            return True
        
        # Contar códigos antes
        codigos_antes = service.contar_codigos_documento(documento_id)
        print(f"\n   Códigos antes de eliminar: {codigos_antes}")
        
        # Eliminar
        resultado = service.eliminar_documento(documento_id, eliminar_codigos=True)
        
        print(f"\n📊 Resultado de eliminación:")
        print(f"   Éxito: {'✅' if resultado.exito else '❌'}")
        print(f"   Manifiesto eliminado: {'✅' if resultado.manifiesto_eliminado else '❌'}")
        print(f"   Códigos eliminados: {resultado.codigos_eliminados}")
        
        if resultado.error:
            print(f"   Error: {resultado.error}")
        
        # Verificar eliminación
        existe = service.documento_indexado(documento_id)
        print(f"\n   Documento aún existe: {'❌ Sí (error)' if existe else '✅ No (correcto)'}")
        
        return resultado.exito and not existe
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Ejecuta todas las pruebas."""
    print("\n" + "="*60)
    print("🧪 PRUEBAS DEL SERVICIO DE INDEXACIÓN - FASE 4.2")
    print("="*60)
    print("Ejecutando pruebas de indexación de documentos...")
    
    resultados = {}
    
    # Test 1: Conexión
    resultados["Conexión ES"] = test_conexion_elasticsearch()
    
    if not resultados["Conexión ES"]:
        print("\n⚠️ ElasticSearch no está disponible.")
        print("   Ejecuta: docker compose up -d elasticsearch")
        print("   Y espera unos segundos a que inicie.\n")
        return
    
    # Test 2: Crear índices
    resultados["Crear Índices"] = test_crear_indices()
    
    # Test 3: Servicio de indexación
    resultados["Servicio Indexación"] = test_servicio_indexacion()
    
    # Test 4: Indexar documento
    resultados["Indexar Documento"] = test_indexar_documento_simulado()
    
    # Test 5: Buscar código
    resultados["Buscar Código"] = test_buscar_codigo()
    
    # Test 6: Actualizar documento
    resultados["Actualizar Documento"] = test_actualizar_documento()
    
    # Test 7: Eliminar documento
    resultados["Eliminar Documento"] = test_eliminar_documento()
    
    # Resumen
    print("\n" + "="*60)
    print("📊 RESUMEN DE PRUEBAS")
    print("="*60)
    
    total_passed = sum(1 for r in resultados.values() if r)
    total_tests = len(resultados)
    
    for nombre, exito in resultados.items():
        estado = "✅ PASS" if exito else "❌ FAIL"
        print(f"   {estado} - {nombre}")
    
    print(f"\n   Total: {total_passed}/{total_tests} pruebas exitosas")
    
    if total_passed == total_tests:
        print("\n🎉 ¡Todas las pruebas pasaron correctamente!")
    else:
        print("\n⚠️ Algunas pruebas fallaron. Revisa los errores arriba.")
    
    print()


if __name__ == "__main__":
    main()

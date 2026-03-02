#!/usr/bin/env python3
"""
Script de prueba para diagnosticar por qué no se encuentra el código SJG999
en la página 2 del documento PDF.

Ejecutar:
    cd backend
    python scripts/test_sjg999.py <ruta_al_pdf>
"""

import sys
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import fitz  # PyMuPDF


def analizar_pdf(pdf_path: str, codigo_buscar: str = "SJG999"):
    """
    Analiza un PDF para encontrar por qué un código no se encuentra.
    """
    print(f"\n{'='*60}")
    print(f"Analizando: {pdf_path}")
    print(f"Buscando código: {codigo_buscar}")
    print('='*60)
    
    doc = fitz.open(pdf_path)
    print(f"\nTotal de páginas: {len(doc)}")
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        images = page.get_images()
        
        print(f"\n--- Página {page_num + 1} ---")
        print(f"  Caracteres de texto: {len(text)}")
        print(f"  Imágenes: {len(images)}")
        
        # Verificar si el código está en el texto
        codigo_upper = codigo_buscar.upper()
        text_upper = text.upper()
        
        # Buscar el código exacto
        if codigo_upper in text_upper:
            print(f"  ✅ ENCONTRADO '{codigo_buscar}' en el texto nativo")
            # Mostrar contexto
            idx = text_upper.find(codigo_upper)
            start = max(0, idx - 50)
            end = min(len(text), idx + len(codigo_upper) + 50)
            contexto = text[start:end].replace('\n', ' ')
            print(f"  Contexto: ...{contexto}...")
        else:
            print(f"  ❌ NO encontrado '{codigo_buscar}' en texto nativo")
        
        # Buscar variaciones
        variaciones = [
            codigo_upper,
            codigo_upper.replace("-", ""),
            codigo_upper.replace("-", " "),
            codigo_buscar.lower(),
        ]
        
        for var in variaciones:
            # Buscar con search_for
            rects = page.search_for(var)
            if rects:
                print(f"  ✅ search_for('{var}'): {len(rects)} coincidencias")
                for rect in rects:
                    print(f"     Coordenadas: {rect}")
        
        # Mostrar primeras palabras del texto
        words = page.get_text("words")
        print(f"  Total palabras (get_text): {len(words)}")
        
        # Buscar palabras similares al código
        for word in words:
            x0, y0, x1, y1, word_text, block, line, word_no = word
            if codigo_upper in word_text.upper() or \
               word_text.upper().replace("-", "") == codigo_upper.replace("-", ""):
                print(f"  ✅ Palabra similar encontrada: '{word_text}' en coords ({x0:.1f}, {y0:.1f})")
        
        # Mostrar muestra del texto
        if len(text) > 0:
            muestra = text[:500].replace('\n', ' ')
            print(f"\n  Muestra de texto (primeros 500 chars):")
            print(f"  {muestra[:200]}...")
    
    doc.close()
    print(f"\n{'='*60}")
    print("Análisis completado")


def test_ocr_service(pdf_path: str, codigo_buscar: str = "SJG999"):
    """
    Prueba el servicio OCR con el PDF.
    """
    print(f"\n{'='*60}")
    print("Probando OCR Service...")
    print('='*60)
    
    try:
        from app.services.ocr_service import get_ocr_service, process_pdf_with_ocr
        
        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()
        
        print("\nProcesando con OCR Service...")
        result = process_pdf_with_ocr(pdf_bytes, force_ocr=True)
        
        print(f"  Tipo documento: {result.document_type.value}")
        print(f"  Desde caché: {result.from_cache}")
        print(f"  OCR aplicado: {result.ocr_applied}")
        print(f"  Total palabras: {result.total_words}")
        print(f"  Tiempo: {result.processing_time_ms:.0f}ms")
        
        for page in result.pages:
            print(f"\n--- Página {page.page_number} ---")
            print(f"  Palabras: {len(page.words)}")
            print(f"  Escaneada: {page.is_scanned}")
            print(f"  Tiempo: {page.processing_time_ms:.0f}ms")
            
            # Buscar código en palabras
            for word in page.words:
                if codigo_buscar.upper() in word.text.upper():
                    print(f"  ✅ ENCONTRADO en OCR: '{word.text}' en ({word.x:.1f}, {word.y:.1f})")
            
            # Buscar en texto completo
            if codigo_buscar.upper() in page.text.upper():
                print(f"  ✅ ENCONTRADO en texto de página OCR")
            else:
                print(f"  ❌ NO encontrado en texto de página OCR")
            
            # Muestra del texto
            if page.text:
                muestra = page.text[:300].replace('\n', ' ')
                print(f"  Muestra: {muestra}...")
                
    except ImportError as e:
        print(f"Error importando OCR Service: {e}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python test_sjg999.py <ruta_al_pdf> [codigo]")
        print("Ejemplo: python test_sjg999.py /path/to/2.pdf SJG999")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    codigo = sys.argv[2] if len(sys.argv) > 2 else "SJG999"
    
    if not Path(pdf_path).exists():
        print(f"Error: El archivo {pdf_path} no existe")
        sys.exit(1)
    
    # Análisis básico con PyMuPDF
    analizar_pdf(pdf_path, codigo)
    
    # Prueba con OCR Service
    test_ocr_service(pdf_path, codigo)

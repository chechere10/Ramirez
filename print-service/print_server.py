#!/usr/bin/env python3
"""
Servicio de impresión local para etiquetas térmicas
Se comunica directamente con impresoras sin usar el diálogo del navegador
"""

import os
import sys
import json
import base64
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import subprocess

# Para Windows
if sys.platform == 'win32':
    import win32print
    import win32ui
    from PIL import Image, ImageDraw, ImageFont, ImageWin
    HAS_WIN32 = True
else:
    HAS_WIN32 = False
    print("⚠️ Este servicio está diseñado para Windows")

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

class PrintServer(BaseHTTPRequestHandler):
    
    def send_cors_headers(self):
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/printers':
            self.get_printers()
        elif parsed.path == '/api/status':
            self.get_status()
        elif parsed.path == '/api/test':
            self.test_print()
        else:
            self.send_error(404)
    
    def do_POST(self):
        parsed = urlparse(self.path)
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}
        
        if parsed.path == '/api/print':
            self.print_label(data)
        elif parsed.path == '/api/print-raw':
            self.print_raw(data)
        else:
            self.send_error(404)
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def get_status(self):
        """Verificar que el servicio está corriendo"""
        self.send_json({
            'status': 'ok',
            'message': 'Servicio de impresión activo',
            'platform': sys.platform,
            'win32_available': HAS_WIN32
        })
    
    def get_printers(self):
        """Listar todas las impresoras instaladas"""
        if not HAS_WIN32:
            self.send_json({'error': 'Solo disponible en Windows'}, 500)
            return
        
        printers = []
        try:
            # Obtener impresora predeterminada
            default_printer = win32print.GetDefaultPrinter()
            
            # Listar todas las impresoras
            for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS):
                printer_name = printer[2]
                
                # Obtener información adicional
                try:
                    handle = win32print.OpenPrinter(printer_name)
                    info = win32print.GetPrinter(handle, 2)
                    win32print.ClosePrinter(handle)
                    
                    status_code = info.get('Status', 0)
                    status_text = self.get_printer_status(status_code)
                except:
                    status_text = 'Desconocido'
                
                printers.append({
                    'name': printer_name,
                    'is_default': printer_name == default_printer,
                    'status': status_text
                })
            
            self.send_json({
                'printers': printers,
                'default': default_printer
            })
        except Exception as e:
            self.send_json({'error': str(e)}, 500)
    
    def get_printer_status(self, status_code):
        """Convertir código de estado a texto"""
        statuses = {
            0: 'Listo',
            1: 'Pausada',
            2: 'Error',
            3: 'Eliminando trabajo',
            4: 'Atasco de papel',
            5: 'Sin papel',
            6: 'Alimentación manual',
            7: 'Problema de papel',
            8: 'Fuera de línea',
            9: 'E/S activa',
            10: 'Ocupada',
            11: 'Imprimiendo',
            12: 'Bandeja de salida llena',
            13: 'No disponible',
            14: 'Esperando',
            15: 'Procesando',
            16: 'Inicializando',
            17: 'Calentando',
            18: 'Poco tóner',
            19: 'Sin tóner',
            20: 'Fallo de página',
            21: 'Intervención del usuario',
            22: 'Sin memoria',
            23: 'Puerta abierta',
            24: 'Servidor desconocido',
            25: 'Ahorro de energía'
        }
        return statuses.get(status_code, f'Código: {status_code}')
    
    def test_print(self):
        """Imprimir página de prueba"""
        if not HAS_WIN32:
            self.send_json({'error': 'Solo disponible en Windows'}, 500)
            return
        
        try:
            printer_name = win32print.GetDefaultPrinter()
            
            # Crear imagen de prueba
            img = Image.new('RGB', (240, 160), 'white')
            draw = ImageDraw.Draw(img)
            
            try:
                font = ImageFont.truetype("arial.ttf", 14)
                font_small = ImageFont.truetype("arial.ttf", 10)
            except:
                font = ImageFont.load_default()
                font_small = font
            
            draw.text((10, 10), "PRUEBA DE IMPRESIÓN", fill='black', font=font)
            draw.text((10, 35), f"Impresora: {printer_name}", fill='black', font=font_small)
            draw.text((10, 55), "ManifiestoCross Print Service", fill='black', font=font_small)
            draw.rectangle([5, 5, 235, 155], outline='black', width=2)
            
            # Imprimir
            self.print_image(img, printer_name)
            
            self.send_json({
                'success': True,
                'message': f'Prueba enviada a {printer_name}'
            })
        except Exception as e:
            self.send_json({'error': str(e)}, 500)
    
    def print_label(self, data):
        """Imprimir etiqueta con datos del producto"""
        if not HAS_WIN32:
            self.send_json({'error': 'Solo disponible en Windows'}, 500)
            return
        
        try:
            printer_name = data.get('printer') or win32print.GetDefaultPrinter()
            producto = data.get('producto', {})
            cantidad = data.get('cantidad', 1)
            config = data.get('config', {})
            
            # Tamaño de etiqueta en pixels (300 DPI aproximado para 30x20mm)
            width = config.get('width', 354)   # ~30mm a 300dpi
            height = config.get('height', 236)  # ~20mm a 300dpi
            
            # Crear imagen de la etiqueta
            img = self.create_label_image(producto, width, height, config)
            
            # Imprimir la cantidad solicitada
            for i in range(cantidad):
                self.print_image(img, printer_name)
            
            self.send_json({
                'success': True,
                'message': f'{cantidad} etiqueta(s) enviada(s) a {printer_name}',
                'printer': printer_name
            })
        except Exception as e:
            self.send_json({'error': str(e)}, 500)
    
    def create_label_image(self, producto, width, height, config):
        """Crear imagen de etiqueta"""
        img = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(img)
        
        # Fuentes
        try:
            font_title = ImageFont.truetype("arial.ttf", config.get('font_size_title', 14))
            font_normal = ImageFont.truetype("arial.ttf", config.get('font_size_normal', 10))
            font_price = ImageFont.truetype("arialbd.ttf", config.get('font_size_price', 16))
            font_small = ImageFont.truetype("arial.ttf", config.get('font_size_small', 8))
        except:
            font_title = ImageFont.load_default()
            font_normal = font_title
            font_price = font_title
            font_small = font_title
        
        y_pos = 5
        
        # Nombre del producto
        nombre = producto.get('nombre', 'PRODUCTO')[:25].upper()
        bbox = draw.textbbox((0, 0), nombre, font=font_title)
        text_width = bbox[2] - bbox[0]
        x_center = (width - text_width) // 2
        draw.text((x_center, y_pos), nombre, fill='black', font=font_title)
        y_pos += 18
        
        # Referencia
        if producto.get('referencia'):
            ref_text = f"REF: {producto['referencia']}"
            bbox = draw.textbbox((0, 0), ref_text, font=font_small)
            text_width = bbox[2] - bbox[0]
            x_center = (width - text_width) // 2
            draw.text((x_center, y_pos), ref_text, fill='black', font=font_small)
            y_pos += 12
        
        # Código de barras (si se proporciona como imagen base64)
        barcode_b64 = producto.get('barcode_image')
        if barcode_b64:
            try:
                barcode_data = base64.b64decode(barcode_b64)
                barcode_img = Image.open(tempfile.SpooledTemporaryFile())
                # ... procesar código de barras
            except:
                pass
        
        # Código de barras como texto (temporal)
        if producto.get('codigoBarras'):
            code_text = producto['codigoBarras']
            bbox = draw.textbbox((0, 0), code_text, font=font_normal)
            text_width = bbox[2] - bbox[0]
            x_center = (width - text_width) // 2
            
            # Dibujar barras simuladas
            bar_y = y_pos + 5
            bar_height = 40
            draw.rectangle([20, bar_y, width-20, bar_y + bar_height], outline='black', width=1)
            draw.text((x_center, bar_y + bar_height + 2), code_text, fill='black', font=font_small)
            y_pos += bar_height + 20
        
        # Precios
        y_pos = height - 35
        
        precio_unidad = producto.get('precioUnidad', 0)
        precio_text = f"${precio_unidad:,.0f}"
        
        if producto.get('precioDocena'):
            # Dos columnas de precios
            draw.text((10, y_pos), "Unidad", fill='black', font=font_small)
            draw.text((10, y_pos + 10), precio_text, fill='black', font=font_price)
            
            precio_docena = producto.get('precioDocena', 0)
            docena_text = f"${precio_docena:,.0f}"
            draw.text((width//2 + 10, y_pos), "Docena", fill='black', font=font_small)
            draw.text((width//2 + 10, y_pos + 10), docena_text, fill='black', font=font_price)
        else:
            # Solo precio unidad centrado
            bbox = draw.textbbox((0, 0), precio_text, font=font_price)
            text_width = bbox[2] - bbox[0]
            x_center = (width - text_width) // 2
            draw.text((x_center, y_pos + 5), precio_text, fill='black', font=font_price)
        
        return img
    
    def print_image(self, img, printer_name):
        """Enviar imagen a la impresora"""
        hdc = win32ui.CreateDC()
        hdc.CreatePrinterDC(printer_name)
        
        hdc.StartDoc('Etiqueta')
        hdc.StartPage()
        
        dib = ImageWin.Dib(img)
        dib.draw(hdc.GetHandleOutput(), (0, 0, img.width, img.height))
        
        hdc.EndPage()
        hdc.EndDoc()
        hdc.DeleteDC()
    
    def print_raw(self, data):
        """Enviar comandos raw ESC/POS a la impresora"""
        if not HAS_WIN32:
            self.send_json({'error': 'Solo disponible en Windows'}, 500)
            return
        
        try:
            printer_name = data.get('printer') or win32print.GetDefaultPrinter()
            raw_data = data.get('data', '')
            
            if isinstance(raw_data, str):
                raw_data = raw_data.encode('utf-8')
            elif isinstance(raw_data, list):
                raw_data = bytes(raw_data)
            
            # Enviar datos raw
            handle = win32print.OpenPrinter(printer_name)
            try:
                job = win32print.StartDocPrinter(handle, 1, ("Raw Label", None, "RAW"))
                win32print.StartPagePrinter(handle)
                win32print.WritePrinter(handle, raw_data)
                win32print.EndPagePrinter(handle)
                win32print.EndDocPrinter(handle)
            finally:
                win32print.ClosePrinter(handle)
            
            self.send_json({
                'success': True,
                'message': f'Datos enviados a {printer_name}'
            })
        except Exception as e:
            self.send_json({'error': str(e)}, 500)

def main():
    port = int(os.environ.get('PRINT_SERVICE_PORT', 9100))
    server = HTTPServer(('0.0.0.0', port), PrintServer)
    
    print(f"""
╔════════════════════════════════════════════════════════════╗
║     ManifiestoCross - Servicio de Impresión Local          ║
╠════════════════════════════════════════════════════════════╣
║  Puerto: {port}                                              ║
║  URL: http://localhost:{port}                                ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║    GET  /api/status   - Estado del servicio                ║
║    GET  /api/printers - Listar impresoras                  ║
║    GET  /api/test     - Imprimir prueba                    ║
║    POST /api/print    - Imprimir etiqueta                  ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    if HAS_WIN32:
        try:
            default = win32print.GetDefaultPrinter()
            print(f"  Impresora predeterminada: {default}")
        except:
            print("  ⚠️ No se pudo obtener impresora predeterminada")
    
    print("\n  Presiona Ctrl+C para detener el servicio\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servicio detenido")
        server.shutdown()

if __name__ == '__main__':
    main()

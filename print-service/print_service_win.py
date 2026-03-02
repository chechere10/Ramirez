#!/usr/bin/env python3
"""
Servicio de Windows para impresión de etiquetas
Instalar: python print_service_win.py install
Iniciar:  python print_service_win.py start
Detener:  python print_service_win.py stop
Eliminar: python print_service_win.py remove
"""

import sys
import os
import socket
import json
import base64
import servicemanager
import win32event
import win32service
import win32serviceutil
import win32print
import win32ui
from PIL import Image, ImageDraw, ImageFont, ImageWin
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

SERVICE_NAME = "ManifiestoCrossPrint"
SERVICE_DISPLAY_NAME = "ManifiestoCross Print Service"
SERVICE_DESCRIPTION = "Servicio de impresión directa para etiquetas térmicas"

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

class PrintRequestHandler(BaseHTTPRequestHandler):
    
    def log_message(self, format, *args):
        pass  # Silenciar logs
    
    def send_cors_headers(self):
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/api/printers':
            self.get_printers()
        elif self.path == '/api/status':
            self.get_status()
        elif self.path == '/api/test':
            self.test_print()
        else:
            self.send_error(404)
    
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}
        
        if self.path == '/api/print':
            self.print_label(data)
        else:
            self.send_error(404)
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def get_status(self):
        self.send_json({
            'status': 'ok',
            'message': 'Servicio de impresión activo',
            'service': SERVICE_NAME
        })
    
    def get_printers(self):
        printers = []
        try:
            default_printer = win32print.GetDefaultPrinter()
            
            for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS):
                printer_name = printer[2]
                
                try:
                    handle = win32print.OpenPrinter(printer_name)
                    info = win32print.GetPrinter(handle, 2)
                    win32print.ClosePrinter(handle)
                    status_code = info.get('Status', 0)
                    status_text = self.get_printer_status(status_code)
                except:
                    status_text = 'Disponible'
                
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
        statuses = {
            0: 'Listo', 1: 'Pausada', 2: 'Error', 3: 'Eliminando',
            4: 'Atasco', 5: 'Sin papel', 8: 'Fuera de línea',
            10: 'Ocupada', 11: 'Imprimiendo'
        }
        return statuses.get(status_code, 'Listo')
    
    def test_print(self):
        try:
            printer_name = win32print.GetDefaultPrinter()
            img = Image.new('RGB', (240, 160), 'white')
            draw = ImageDraw.Draw(img)
            
            try:
                font = ImageFont.truetype("arial.ttf", 14)
            except:
                font = ImageFont.load_default()
            
            draw.text((10, 10), "PRUEBA", fill='black', font=font)
            draw.text((10, 35), SERVICE_NAME, fill='black', font=font)
            draw.rectangle([5, 5, 235, 155], outline='black', width=2)
            
            self.print_image(img, printer_name)
            
            self.send_json({
                'success': True,
                'message': f'Prueba enviada a {printer_name}'
            })
        except Exception as e:
            self.send_json({'error': str(e)}, 500)
    
    def print_label(self, data):
        try:
            printer_name = data.get('printer') or win32print.GetDefaultPrinter()
            producto = data.get('producto', {})
            cantidad = data.get('cantidad', 1)
            config = data.get('config', {})
            
            width = config.get('width', 354)
            height = config.get('height', 236)
            
            img = self.create_label_image(producto, width, height, config)
            
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
        img = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(img)
        
        try:
            font_title = ImageFont.truetype("arial.ttf", 14)
            font_normal = ImageFont.truetype("arial.ttf", 10)
            font_price = ImageFont.truetype("arialbd.ttf", 16)
            font_small = ImageFont.truetype("arial.ttf", 8)
        except:
            font_title = ImageFont.load_default()
            font_normal = font_title
            font_price = font_title
            font_small = font_title
        
        y_pos = 5
        
        # Nombre
        nombre = producto.get('nombre', 'PRODUCTO')[:25].upper()
        bbox = draw.textbbox((0, 0), nombre, font=font_title)
        text_width = bbox[2] - bbox[0]
        x_center = (width - text_width) // 2
        draw.text((x_center, y_pos), nombre, fill='black', font=font_title)
        y_pos += 20
        
        # Referencia
        if producto.get('referencia'):
            ref_text = f"REF: {producto['referencia']}"
            bbox = draw.textbbox((0, 0), ref_text, font=font_small)
            text_width = bbox[2] - bbox[0]
            x_center = (width - text_width) // 2
            draw.text((x_center, y_pos), ref_text, fill='black', font=font_small)
            y_pos += 14
        
        # Código de barras (texto)
        if producto.get('codigoBarras'):
            code_text = producto['codigoBarras']
            bar_y = y_pos + 5
            bar_height = 50
            
            # Dibujar barras simuladas
            bar_width = width - 40
            bar_x = 20
            for i, char in enumerate(code_text):
                if i % 2 == 0:
                    x = bar_x + (i * bar_width // len(code_text))
                    draw.rectangle([x, bar_y, x + 2, bar_y + bar_height], fill='black')
            
            draw.rectangle([bar_x, bar_y, bar_x + bar_width, bar_y + bar_height], outline='black', width=1)
            
            bbox = draw.textbbox((0, 0), code_text, font=font_small)
            text_width = bbox[2] - bbox[0]
            x_center = (width - text_width) // 2
            draw.text((x_center, bar_y + bar_height + 3), code_text, fill='black', font=font_small)
            y_pos += bar_height + 25
        
        # Precios
        y_pos = height - 40
        
        precio_unidad = producto.get('precioUnidad', 0)
        precio_text = f"${precio_unidad:,.0f}"
        
        if producto.get('precioDocena') and producto.get('precioDocena') > 0:
            draw.text((15, y_pos), "Unidad", fill='black', font=font_small)
            draw.text((15, y_pos + 12), precio_text, fill='black', font=font_price)
            
            precio_docena = producto.get('precioDocena', 0)
            docena_text = f"${precio_docena:,.0f}"
            draw.text((width//2 + 15, y_pos), "Docena", fill='black', font=font_small)
            draw.text((width//2 + 15, y_pos + 12), docena_text, fill='black', font=font_price)
        else:
            bbox = draw.textbbox((0, 0), precio_text, font=font_price)
            text_width = bbox[2] - bbox[0]
            x_center = (width - text_width) // 2
            draw.text((x_center, y_pos + 8), precio_text, fill='black', font=font_price)
        
        return img
    
    def print_image(self, img, printer_name):
        hdc = win32ui.CreateDC()
        hdc.CreatePrinterDC(printer_name)
        
        hdc.StartDoc('Etiqueta')
        hdc.StartPage()
        
        dib = ImageWin.Dib(img)
        dib.draw(hdc.GetHandleOutput(), (0, 0, img.width, img.height))
        
        hdc.EndPage()
        hdc.EndDoc()
        hdc.DeleteDC()


class PrintService(win32serviceutil.ServiceFramework):
    _svc_name_ = SERVICE_NAME
    _svc_display_name_ = SERVICE_DISPLAY_NAME
    _svc_description_ = SERVICE_DESCRIPTION
    
    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.server = None
    
    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        if self.server:
            self.server.shutdown()
    
    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        self.main()
    
    def main(self):
        port = 9100
        self.server = HTTPServer(('0.0.0.0', port), PrintRequestHandler)
        
        server_thread = threading.Thread(target=self.server.serve_forever)
        server_thread.daemon = True
        server_thread.start()
        
        win32event.WaitForSingleObject(self.stop_event, win32event.INFINITE)


if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(PrintService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(PrintService)

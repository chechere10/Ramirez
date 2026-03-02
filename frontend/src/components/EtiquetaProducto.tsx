import { useRef, useState } from 'react'
import { X, Printer, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { useEffect } from 'react'

const PRINT_SERVICE_URL = 'http://localhost:9100'

interface PrinterInfo {
  name: string
  is_default: boolean
  status: string
}

interface EtiquetaProductoProps {
  producto: {
    nombre: string
    codigoBarras: string
    referencia?: string
    precioUnidad: number
    precioDocena?: number
  }
  cantidad?: number
  onClose: () => void
}

export function EtiquetaProducto({ producto, cantidad = 1, onClose }: EtiquetaProductoProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [printing, setPrinting] = useState(false)
  const [printResult, setPrintResult] = useState<{ success: boolean; message: string } | null>(null)

  // Verificar servicio de impresión al montar
  useEffect(() => {
    checkPrintService()
  }, [])

  const checkPrintService = async () => {
    setServiceStatus('checking')
    try {
      const response = await fetch(`${PRINT_SERVICE_URL}/api/printers`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      if (response.ok) {
        const data = await response.json()
        setPrinters(data.printers || [])
        setSelectedPrinter(data.default || '')
        setServiceStatus('online')
      } else {
        setServiceStatus('offline')
      }
    } catch {
      setServiceStatus('offline')
    }
  }

  const printDirect = async () => {
    if (serviceStatus !== 'online') return
    
    setPrinting(true)
    setPrintResult(null)
    
    const cantidadInput = document.getElementById('cantidad-etiquetas') as HTMLInputElement
    const cantidadImprimir = cantidadInput ? parseInt(cantidadInput.value) || 1 : cantidad
    
    try {
      const response = await fetch(`${PRINT_SERVICE_URL}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer: selectedPrinter,
          cantidad: cantidadImprimir,
          producto: {
            nombre: producto.nombre,
            codigoBarras: producto.codigoBarras,
            referencia: producto.referencia,
            precioUnidad: producto.precioUnidad,
            precioDocena: producto.precioDocena
          },
          config: {
            width: 354,
            height: 236
          }
        })
      })
      
      const result = await response.json()
      setPrintResult({
        success: response.ok,
        message: result.message || result.error || 'Error desconocido'
      })
    } catch (err) {
      setPrintResult({
        success: false,
        message: 'No se pudo conectar con el servicio de impresión'
      })
    } finally {
      setPrinting(false)
    }
  }

  useEffect(() => {
    if (barcodeRef.current && producto.codigoBarras) {
      try {
        JsBarcode(barcodeRef.current, producto.codigoBarras, {
          format: 'EAN13',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          background: '#ffffff',
          lineColor: '#000000'
        })
      } catch (e) {
        // Si falla EAN13, intentar CODE128
        try {
          JsBarcode(barcodeRef.current, producto.codigoBarras, {
            format: 'CODE128',
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 5,
            background: '#ffffff',
            lineColor: '#000000'
          })
        } catch (e2) {
          console.error('Error generando código de barras:', e2)
        }
      }
    }
  }, [producto.codigoBarras])

  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio)
  }

  const handlePrint = () => {
    // Obtener cantidad del input
    const cantidadInput = document.getElementById('cantidad-etiquetas') as HTMLInputElement
    const cantidadImprimir = cantidadInput ? parseInt(cantidadInput.value) || 1 : cantidad

    // Obtener el SVG del código de barras
    const barcodeHTML = barcodeRef.current?.outerHTML || ''
    
    // Crear iframe oculto para impresión
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      alert('Error al preparar la impresión')
      document.body.removeChild(iframe)
      return
    }

    // Generar HTML para múltiples etiquetas
    let etiquetasHTML = ''
    for (let i = 0; i < cantidadImprimir; i++) {
      etiquetasHTML += `
        <div class="etiqueta">
          <div class="nombre">${producto.nombre}</div>
          ${producto.referencia ? `<div class="referencia">REF: ${producto.referencia}</div>` : ''}
          <div class="barcode-container">
            ${barcodeHTML}
          </div>
          <div class="precios">
            <div class="precio-unidad">
              <span class="label">Unidad:</span>
              <span class="valor">${formatPrecio(producto.precioUnidad)}</span>
            </div>
            ${producto.precioDocena && producto.precioDocena > 0 ? `
              <div class="precio-docena">
                <span class="label">Docena:</span>
                <span class="valor">${formatPrecio(producto.precioDocena)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `
    }

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta</title>
        <style>
          @page {
            size: 30mm 20mm;
            margin: 0 !important;
            padding: 0 !important;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background: white;
            padding: 0;
            margin: 0;
          }
          .etiqueta {
            width: 30mm;
            height: 20mm;
            padding: 1mm;
            page-break-after: always;
            background: white;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .nombre {
            font-size: 6px;
            font-weight: bold;
            text-align: center;
            line-height: 1;
            max-height: 12px;
            overflow: hidden;
            text-transform: uppercase;
          }
          .referencia {
            font-size: 5px;
            text-align: center;
            color: #000;
          }
          .barcode-container {
            text-align: center;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .barcode-container svg {
            width: 26mm !important;
            height: 8mm !important;
          }
          .precios {
            display: flex;
            justify-content: space-around;
          }
          .precio-unidad, .precio-docena {
            text-align: center;
          }
          .label {
            font-size: 4px;
            color: #000;
            display: block;
          }
          .valor {
            font-size: 7px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${etiquetasHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    // Esperar a que se cargue el contenido y luego imprimir
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.error('Error al imprimir:', e)
      }
      // Remover iframe después de un tiempo
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 250)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Imprimir Etiqueta
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Cerrar"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Vista previa de la etiqueta */}
          <div 
            ref={printRef}
                        className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 w-[220px] mx-auto"
          >
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase leading-tight mb-1">
                {producto.nombre}
              </h3>
              {producto.referencia && (
                <p className="text-xs text-gray-600 mb-2">REF: {producto.referencia}</p>
              )}
              
              {producto.codigoBarras ? (
                <div className="flex justify-center my-2">
                  <svg ref={barcodeRef}></svg>
                </div>
              ) : (
                <p className="text-xs text-gray-400 my-4">Sin código de barras</p>
              )}
              
              <div className="flex justify-around mt-2 pt-2 border-t border-gray-200">
                <div className="text-center">
                  <span className="text-[10px] text-gray-500 block">Unidad</span>
                  <span className="text-sm font-bold">{formatPrecio(producto.precioUnidad)}</span>
                </div>
                {producto.precioDocena && producto.precioDocena > 0 && (
                  <div className="text-center">
                    <span className="text-[10px] text-gray-500 block">Docena</span>
                    <span className="text-sm font-bold text-green-600">{formatPrecio(producto.precioDocena)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cantidad de etiquetas */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cantidad de etiquetas a imprimir
            </label>
            <input
              type="number"
              min="1"
              max="100"
              defaultValue={cantidad}
              id="cantidad-etiquetas"
              placeholder="1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Estado del servicio de impresión */}
          <div className={`rounded-lg p-3 mb-4 ${
            serviceStatus === 'online' ? 'bg-green-50 dark:bg-green-900/20' :
            serviceStatus === 'offline' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
            'bg-gray-50 dark:bg-gray-900/20'
          }`}>
            <div className="flex items-center gap-2">
              {serviceStatus === 'checking' && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              )}
              {serviceStatus === 'online' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {serviceStatus === 'offline' && (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <span className={`text-xs font-medium ${
                serviceStatus === 'online' ? 'text-green-700 dark:text-green-300' :
                serviceStatus === 'offline' ? 'text-yellow-700 dark:text-yellow-300' :
                'text-gray-700 dark:text-gray-300'
              }`}>
                {serviceStatus === 'checking' && 'Verificando servicio...'}
                {serviceStatus === 'online' && 'Servicio de impresión activo'}
                {serviceStatus === 'offline' && 'Servicio no disponible - usando navegador'}
              </span>
              {serviceStatus === 'offline' && (
                <button
                  onClick={checkPrintService}
                  className="ml-auto text-xs text-blue-600 hover:underline"
                >
                  Reintentar
                </button>
              )}
            </div>
          </div>

          {/* Selector de impresora (solo si servicio activo) */}
          {serviceStatus === 'online' && printers.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Impresora
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} {p.is_default ? '(Predeterminada)' : ''} - {p.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Resultado de impresión */}
          {printResult && (
            <div className={`rounded-lg p-3 mb-4 ${
              printResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center gap-2">
                {printResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-xs ${
                  printResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {printResult.message}
                </span>
              </div>
            </div>
          )}

          {/* Instrucciones si servicio offline */}
          {serviceStatus === 'offline' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Para impresión directa:</strong> Ejecuta <code className="bg-blue-100 px-1 rounded">start.bat</code> en 
                la carpeta <code className="bg-blue-100 px-1 rounded">print-service</code>
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            
            {serviceStatus === 'online' ? (
              <button
                onClick={printDirect}
                disabled={printing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {printing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {printing ? 'Imprimiendo...' : 'Imprimir Directo'}
              </button>
            ) : (
              <button
                onClick={handlePrint}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir (Navegador)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

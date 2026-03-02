/**
 * ResaltarPage - Página principal para resaltar códigos en manifiestos.
 * 
 * Flujo profesional:
 * 1. Subir manifiesto PDF (DIAN)
 * 2. Escribir códigos a buscar (manual)
 * 3. ANALIZAR - Ver qué se encontró y qué no
 * 4. Descargar solo después de validar
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  Upload, 
  FileText, 
  Search, 
  Download, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  FileDown,
  Loader2,
  X,
  AlertTriangle,
  Eye,
  XCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react'

type ProcessStatus = 'idle' | 'analyzing' | 'analyzed' | 'downloading' | 'completed' | 'error'

interface CodigoConNumero {
  numero: number  // Número de línea en la factura (1, 2, 3...)
  codigo: string
}

interface CodigoResultado {
  numero: number  // Número de línea en la factura
  codigo: string
  encontrado: boolean
  paginas: number[]
  frecuencia: number
  variantes?: string[] // Variantes encontradas del código
}

interface AnalysisResult {
  totalBuscados: number
  totalEncontrados: number
  totalNoEncontrados: number
  paginasDocumento: number
  tasaExito: number
  codigosEncontrados: CodigoResultado[]
  codigosNoEncontrados: CodigoResultado[]
  duplicadosIngresados: string[]
  tiempoProcesamiento: number
  detallesPorPagina: Record<string, string[]>
}

interface Cliente {
  id: string
  nombre: string
  nit: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://100.71.152.76:8005'

export function ResaltarPage() {
  // Estado de los archivos PDF - ahora múltiples
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [pdfPreviewUrls, setPdfPreviewUrls] = useState<string[]>([])
  
  // Estado de los códigos
  const [codigosText, setCodigosText] = useState('')
  const [codigosList, setCodigosList] = useState<CodigoConNumero[]>([])
  const [duplicados, setDuplicados] = useState<{numero: number, codigo: string}[]>([])
  
  // Estado del color
  const [colorResaltado, setColorResaltado] = useState('amarillo')
  
  // Estado del proceso
  const [status, setStatus] = useState<ProcessStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  
  // UI State
  const [showNoEncontrados, setShowNoEncontrados] = useState(true)
  const [showEncontrados, setShowEncontrados] = useState(true)
  
  // Estado de clientes para guardar (cargar desde localStorage)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState('')
  
  // Estado para validación de colores
  const [ultimosColoresCliente, setUltimosColoresCliente] = useState<string[]>([])
  const [colorSugerido, setColorSugerido] = useState<string | null>(null)
  
  // Cargar clientes del localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem('manifesto_clientes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setClientes(parsed.map((c: {id: string, nombre: string, nit: string}) => ({
          id: c.id,
          nombre: c.nombre,
          nit: c.nit
        })))
      } catch {
        setClientes([])
      }
    }
  }, [])
  
  // Cargar últimos colores cuando se selecciona un cliente
  useEffect(() => {
    if (!clienteSeleccionado) {
      setUltimosColoresCliente([])
      setColorSugerido(null)
      return
    }
    
    const cargarUltimosColores = async () => {
      try {
        const response = await fetch(`${API_URL}/api/highlight/clientes/${clienteSeleccionado}/ultimos-colores?cantidad=3`)
        if (response.ok) {
          const data = await response.json()
          setUltimosColoresCliente(data.colores || [])
          if (data.sugerencia && data.colores?.includes(colorResaltado)) {
            // Si el color actual está en los últimos usados, cambiar al sugerido
            setColorResaltado(data.sugerencia)
            setColorSugerido(data.sugerencia)
          } else {
            setColorSugerido(data.sugerencia)
          }
        }
      } catch (err) {
        console.error('Error cargando últimos colores:', err)
      }
    }
    
    cargarUltimosColores()
  }, [clienteSeleccionado])
  
  // Referencia al input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Referencias para sincronizar scroll del editor
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  
  // Parsear códigos del texto y detectar duplicados
  const parseCodigos = useCallback((text: string) => {
    const lineas = text.split(/[\n\r]+/)
    const todosLosCodigos: {numero: number, codigo: string}[] = []
    let numeroLinea = 0
    
    lineas.forEach(linea => {
      // Separar por coma o punto y coma dentro de cada línea
      const codigosEnLinea = linea.split(/[,;\t]+/).map(c => c.trim().toUpperCase()).filter(c => c.length > 0)
      codigosEnLinea.forEach(codigo => {
        numeroLinea++
        todosLosCodigos.push({ numero: numeroLinea, codigo })
      })
    })
    
    // Detectar duplicados (mantener el primero, marcar los demás)
    const seen = new Set<string>()
    const dups: {numero: number, codigo: string}[] = []
    const uniqueCodigos: CodigoConNumero[] = []
    
    todosLosCodigos.forEach(item => {
      if (seen.has(item.codigo)) {
        dups.push(item)
      } else {
        seen.add(item.codigo)
        uniqueCodigos.push(item)
      }
    })
    
    setDuplicados(dups)
    setCodigosList(uniqueCodigos)
    return uniqueCodigos
  }, [])
  
  // Manejar cambio de texto de códigos
  const handleCodigosChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setCodigosText(text)
    parseCodigos(text)
    // Reset analysis when codes change
    if (analysisResult) {
      setAnalysisResult(null)
      setStatus('idle')
    }
  }, [parseCodigos, analysisResult])
  
  // Manejar selección de archivo - ahora múltiple
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const pdfFilesOnly = files.filter(f => f.type === 'application/pdf')
    
    if (pdfFilesOnly.length > 0) {
      setPdfFiles(prev => [...prev, ...pdfFilesOnly])
      const newUrls = pdfFilesOnly.map(f => URL.createObjectURL(f))
      setPdfPreviewUrls(prev => [...prev, ...newUrls])
      setError(null)
      setAnalysisResult(null)
      setStatus('idle')
    }
    
    if (pdfFilesOnly.length < files.length) {
      setError('Solo se aceptan archivos PDF')
    }
    
    // Reset input para permitir seleccionar el mismo archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])
  
  // Manejar drop de archivo - ahora múltiple
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const pdfFilesOnly = files.filter(f => f.type === 'application/pdf')
    
    if (pdfFilesOnly.length > 0) {
      setPdfFiles(prev => [...prev, ...pdfFilesOnly])
      const newUrls = pdfFilesOnly.map(f => URL.createObjectURL(f))
      setPdfPreviewUrls(prev => [...prev, ...newUrls])
      setError(null)
      setAnalysisResult(null)
      setStatus('idle')
    } else {
      setError('Por favor arrastra archivos PDF válidos')
    }
  }, [])
  
  // Eliminar un archivo específico
  const removeFile = useCallback((index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index))
    setPdfPreviewUrls(prev => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
    setAnalysisResult(null)
    setStatus('idle')
  }, [])
  
  // Limpiar todos los archivos
  const clearFile = useCallback(() => {
    pdfPreviewUrls.forEach(url => URL.revokeObjectURL(url))
    setPdfFiles([])
    setPdfPreviewUrls([])
    setAnalysisResult(null)
    setStatus('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [pdfPreviewUrls])
  
  // PASO 3: Analizar PDFs (múltiples)
  const analizarPdf = useCallback(async () => {
    if (pdfFiles.length === 0 || codigosList.length === 0) return
    
    setStatus('analyzing')
    setError(null)
    const startTime = Date.now()
    
    // DEBUG: Mostrar PDFs que se van a analizar
    console.log('=== DEBUG ANÁLISIS ===')
    console.log('PDFs a analizar:', pdfFiles.map(p => p.name))
    
    try {
      // Acumular resultados de todos los PDFs
      const todosEncontrados = new Map<string, CodigoResultado>()
      let totalPaginas = 0
      const detalleGlobal: Record<string, string[]> = {}
      
      // Procesar cada PDF
      for (const pdfFile of pdfFiles) {
        console.log('Procesando PDF:', pdfFile.name)
        const formData = new FormData()
        formData.append('pdf', pdfFile)
        formData.append('codigos', codigosList.map(c => c.codigo).join(','))
        formData.append('color', colorResaltado)
        
        const response = await fetch(`${API_URL}/api/highlight/resaltar-info`, {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `Error al analizar ${pdfFile.name}`)
        }
        
        const data = await response.json()
        totalPaginas += data.paginas_originales || 0
        
        // Procesar detalle por página de este PDF
        const detallePorPagina = data.detalle_por_pagina || {}
        
        codigosList.forEach(item => {
          Object.entries(detallePorPagina).forEach(([pagina, codigos]) => {
            const codigosArr = codigos as string[]
            const count = codigosArr.filter(c => 
              c.toUpperCase().replace(/[-\s]/g, '') === item.codigo.toUpperCase().replace(/[-\s]/g, '')
            ).length
            
            if (count > 0) {
              const existente = todosEncontrados.get(item.codigo)
              if (existente) {
                existente.paginas.push(parseInt(pagina))
                existente.frecuencia += count
                if (!existente.variantes) existente.variantes = []
                existente.variantes.push(pdfFile.name)
              } else {
                todosEncontrados.set(item.codigo, {
                  numero: item.numero,
                  codigo: item.codigo,
                  encontrado: true,
                  paginas: [parseInt(pagina)],
                  frecuencia: count,
                  variantes: [pdfFile.name],
                })
              }
              
              // Agregar al detalle global
              const key = `${pdfFile.name} - Pág ${pagina}`
              if (!detalleGlobal[key]) detalleGlobal[key] = []
              detalleGlobal[key].push(item.codigo)
            }
          })
        })
      }
      
      const endTime = Date.now()
      
      // Construir listas finales
      const codigosEncontrados: CodigoResultado[] = []
      const codigosNoEncontrados: CodigoResultado[] = []
      
      codigosList.forEach(item => {
        const encontrado = todosEncontrados.get(item.codigo)
        if (encontrado) {
          codigosEncontrados.push(encontrado)
        } else {
          codigosNoEncontrados.push({
            numero: item.numero,
            codigo: item.codigo,
            encontrado: false,
            paginas: [],
            frecuencia: 0,
          })
        }
      })
      
      // DEBUG: Mostrar resultado del análisis
      console.log('=== RESULTADO ANÁLISIS ===')
      console.log('Códigos encontrados con sus PDFs:')
      codigosEncontrados.forEach(c => {
        console.log(`  ${c.codigo}: variantes = ${JSON.stringify(c.variantes)}`)
      })
      
      const result = {
        totalBuscados: codigosList.length,
        totalEncontrados: codigosEncontrados.length,
        totalNoEncontrados: codigosNoEncontrados.length,
        paginasDocumento: totalPaginas,
        tasaExito: codigosList.length > 0 
          ? (codigosEncontrados.length / codigosList.length) * 100 
          : 0,
        codigosEncontrados,
        codigosNoEncontrados,
        duplicadosIngresados: duplicados.map(d => d.codigo),
        tiempoProcesamiento: endTime - startTime,
        detallesPorPagina: detalleGlobal,
      }
      
      setAnalysisResult(result)
      
      setStatus('analyzed')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al analizar')
      setStatus('error')
    }
  }, [pdfFiles, codigosList, colorResaltado, duplicados])
  
  // PASO 4: Descargar PDFs resaltados (solo los que tienen códigos encontrados)
  // @ts-ignore - Función disponible para uso futuro
  const _descargarPdfResaltado = useCallback(async () => {
    if (pdfFiles.length === 0 || codigosList.length === 0 || !analysisResult) return
    
    setStatus('downloading')
    setError(null)
    
    try {
      // Determinar qué PDFs tienen códigos encontrados
      const pdfsConResultados = new Set<string>()
      analysisResult.codigosEncontrados.forEach(codigo => {
        codigo.variantes?.forEach(pdfName => pdfsConResultados.add(pdfName))
      })
      
      // Si no hay PDFs con resultados, mostrar mensaje
      if (pdfsConResultados.size === 0) {
        setError('No hay códigos encontrados para resaltar en ningún documento')
        setStatus('analyzed')
        return
      }
      
      // Filtrar solo los PDFs que tienen resultados
      const pdfsADescargar = pdfFiles.filter(pdf => pdfsConResultados.has(pdf.name))
      
      // Descargar cada PDF resaltado (solo los que tienen resultados)
      for (const pdfFile of pdfsADescargar) {
        const formData = new FormData()
        formData.append('pdf', pdfFile)
        formData.append('codigos', codigosList.map(c => c.codigo).join(','))
        formData.append('color', colorResaltado)
        
        const response = await fetch(`${API_URL}/api/highlight/resaltar-pdf`, {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error(`Error al generar PDF resaltado para ${pdfFile.name}`)
        }
        
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${pdfFile.name.replace('.pdf', '')}_resaltado.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      
      setStatus('completed')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar')
      setStatus('error')
    }
  }, [pdfFiles, codigosList, colorResaltado, analysisResult])
  
  // Guardar manifiesto en la carpeta del cliente
  const guardarManifiesto = useCallback(async () => {
    if (pdfFiles.length === 0 || codigosList.length === 0 || !analysisResult || !clienteSeleccionado) return
    
    setStatus('downloading')
    setError(null)
    
    try {
      const cliente = clientes.find(c => c.id === clienteSeleccionado)
      const clienteNombre = cliente?.nombre || 'Sin cliente'
      
      // Determinar qué PDFs tienen códigos encontrados
      const pdfsConResultados = new Set<string>()
      analysisResult.codigosEncontrados.forEach(codigo => {
        codigo.variantes?.forEach(pdfName => pdfsConResultados.add(pdfName))
      })
      
      // DEBUG: Mostrar información de diagnóstico
      console.log('=== DEBUG GUARDAR MANIFIESTO ===')
      console.log('PDFs cargados:', pdfFiles.map(p => p.name))
      console.log('PDFs con resultados (variantes):', Array.from(pdfsConResultados))
      console.log('Códigos encontrados con variantes:', analysisResult.codigosEncontrados.map(c => ({
        codigo: c.codigo,
        variantes: c.variantes
      })))
      
      // Si no hay PDFs con resultados, mostrar mensaje
      if (pdfsConResultados.size === 0) {
        setError('No hay códigos encontrados para guardar en ningún documento')
        setStatus('analyzed')
        return
      }
      
      // Filtrar solo los PDFs que tienen resultados
      const pdfsAGuardar = pdfFiles.filter(pdf => pdfsConResultados.has(pdf.name))
      console.log('PDFs a guardar después del filtro:', pdfsAGuardar.map(p => p.name))
      
      // Si el filtro eliminó todos los PDFs, guardar todos (fallback)
      const pdfsFinales = pdfsAGuardar.length > 0 ? pdfsAGuardar : pdfFiles
      console.log('PDFs finales a guardar:', pdfsFinales.map(p => p.name))
      
      // Guardar cada PDF resaltado
      let guardadosExitosos = 0
      for (const pdfFile of pdfsFinales) {
        console.log(`Guardando PDF ${guardadosExitosos + 1}/${pdfsFinales.length}: ${pdfFile.name}`)
        const formData = new FormData()
        formData.append('pdf', pdfFile)
        formData.append('codigos', codigosList.map(c => c.codigo).join(','))
        formData.append('color', colorResaltado)
        formData.append('cliente', clienteNombre)
        formData.append('cliente_id', clienteSeleccionado)
        formData.append('cliente_nit', cliente?.nit || '')
        
        const response = await fetch(`${API_URL}/api/highlight/guardar-manifiesto`, {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Error guardando ${pdfFile.name}:`, errorText)
          throw new Error(`Error al guardar manifiesto ${pdfFile.name}`)
        }
        
        guardadosExitosos++
        console.log(`PDF ${pdfFile.name} guardado exitosamente`)
      }
      
      console.log(`Total de PDFs guardados: ${guardadosExitosos}`)
      setStatus('completed')
      alert(`✅ ${guardadosExitosos} manifiesto(s) guardado(s) exitosamente para el cliente "${clienteNombre}"`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setStatus('error')
    }
  }, [pdfFiles, codigosList, colorResaltado, analysisResult, clienteSeleccionado, clientes])
  
  // Copiar códigos no encontrados al portapapeles (con números)
  const copiarNoEncontrados = useCallback(() => {
    if (analysisResult) {
      const text = analysisResult.codigosNoEncontrados
        .map(c => `#${c.numero} - ${c.codigo}`)
        .join('\n')
      navigator.clipboard.writeText(text)
    }
  }, [analysisResult])
  
  // Nueva búsqueda
  const nuevaBusqueda = useCallback(() => {
    setAnalysisResult(null)
    setStatus('idle')
    setError(null)
  }, [])
  
  const isProcessing = status === 'analyzing' || status === 'downloading'
  const canAnalyze = pdfFiles.length > 0 && codigosList.length > 0 && !isProcessing
  const canDownload = analysisResult && analysisResult.totalEncontrados > 0 && !isProcessing
  
  const colores = [
    { value: 'amarillo', label: 'Amarillo', class: 'bg-yellow-500' },
    { value: 'verde', label: 'Verde', class: 'bg-green-600' },
    { value: 'azul', label: 'Azul', class: 'bg-blue-500' },
    { value: 'rosa', label: 'Rosa', class: 'bg-pink-500' },
    { value: 'naranja', label: 'Naranja', class: 'bg-orange-500' },
    { value: 'cian', label: 'Cian', class: 'bg-cyan-600' },
  ]
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Resaltar Códigos en Manifiesto
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Sube uno o más manifiestos DIAN, escribe los códigos, analiza los resultados y descarga los PDFs resaltados
        </p>
      </div>
      
      {/* Pasos 1 y 2: Subir PDF y escribir códigos */}
      {!analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo - Subir PDF */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                1. Manifiesto DIAN (PDF)
                {pdfFiles.length > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    ({pdfFiles.length} archivo{pdfFiles.length !== 1 ? 's' : ''})
                  </span>
                )}
              </h2>
              
              {/* Zona de drop siempre visible */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors mb-4"
              >
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">
                  {pdfFiles.length === 0 
                    ? 'Arrastra tus PDFs aquí o haz clic para seleccionar'
                    : 'Agregar más archivos PDF'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Puedes seleccionar múltiples archivos
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              {/* Lista de archivos cargados */}
              {pdfFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pdfFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(index) }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Quitar archivo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Botón limpiar todo */}
                  <button
                    onClick={clearFile}
                    className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Quitar todos
                  </button>
                </div>
              )}
            </div>
            
            {/* Selector de color */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Color del resaltado
              </h3>
              <div className="flex flex-wrap gap-2">
                {colores.map((color) => {
                  const esColorReciente = ultimosColoresCliente.includes(color.value)
                  return (
                    <button
                      key={color.value}
                      onClick={() => setColorResaltado(color.value)}
                      className={`
                        px-3 py-1.5 rounded-full text-sm font-medium transition-all relative
                        ${colorResaltado === color.value
                          ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                          : 'hover:scale-105'
                        }
                        ${esColorReciente && clienteSeleccionado ? 'opacity-50' : ''}
                      `}
                      title={esColorReciente && clienteSeleccionado ? 'Color usado recientemente en este cliente' : ''}
                    >
                      <span className={`inline-block w-3 h-3 rounded-full ${color.class} mr-2`} />
                      {color.label}
                      {esColorReciente && clienteSeleccionado && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center">!</span>
                      )}
                    </button>
                  )
                })}
              </div>
              
              {/* Advertencia de color repetido */}
              {clienteSeleccionado && ultimosColoresCliente.includes(colorResaltado) && (
                <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1">
                    <span className="text-orange-500">⚠️</span>
                    Este color fue usado recientemente para este cliente. 
                    {colorSugerido && colorSugerido !== colorResaltado && (
                      <button 
                        onClick={() => setColorResaltado(colorSugerido)}
                        className="underline font-medium hover:text-orange-800 dark:hover:text-orange-200"
                      >
                        Usar {colorSugerido}
                      </button>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Panel derecho - Códigos */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-green-500" />
                2. Códigos a buscar
              </h2>
              
              {/* Editor con números de línea */}
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                {/* Números de línea */}
                <div 
                  ref={lineNumbersRef}
                  className="bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500 font-mono text-sm py-3 px-2 select-none text-right border-r border-gray-300 dark:border-gray-600 min-w-[3rem] overflow-hidden h-60"
                >
                  {(() => {
                    const lines = codigosText.split('\n')
                    const lineCount = Math.max(lines.length, 10)
                    return Array.from({ length: lineCount }, (_, i) => (
                      <div key={i} className="leading-6 h-6">
                        {i + 1}
                      </div>
                    ))
                  })()}
                </div>
                {/* Área de texto */}
                <textarea
                  ref={textareaRef}
                  value={codigosText}
                  onChange={handleCodigosChange}
                  onScroll={(e) => {
                    if (lineNumbersRef.current) {
                      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
                    }
                  }}
                  placeholder="Escribe un código por línea...&#10;&#10;Ejemplo:&#10;BX03D&#10;BX12D&#10;KM072&#10;LG101&#10;PK81"
                  className="flex-1 h-60 py-3 px-3 resize-none focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 font-mono text-sm leading-6"
                  disabled={isProcessing}
                  style={{ lineHeight: '1.5rem' }}
                />
              </div>
              
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                💡 Un código por línea. El número de la izquierda es el que verás en los resultados.
              </p>
              
              {/* Estadísticas de códigos ingresados */}
              <div className="mt-3 space-y-2">
                {codigosList.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {codigosList.length}
                      </span>
                      {' '}código{codigosList.length !== 1 ? 's' : ''} único{codigosList.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => { setCodigosText(''); setCodigosList([]); setDuplicados([]) }}
                      className="text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Limpiar
                    </button>
                  </div>
                )}
                
                {/* Alerta de duplicados */}
                {duplicados.length > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium text-yellow-800 dark:text-yellow-300">
                        {duplicados.length} código{duplicados.length > 1 ? 's' : ''} duplicado{duplicados.length > 1 ? 's' : ''} (se ignorarán):
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-400 font-mono">
                        {duplicados.map(d => `#${d.numero} ${d.codigo}`).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Preview de códigos con números */}
              {codigosList.length > 0 && codigosList.length <= 50 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {codigosList.map((item) => (
                    <span
                      key={item.numero}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-gray-400 dark:text-gray-500 mr-1">#{item.numero}</span>
                      {item.codigo}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">Error</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}
      
      {/* Botón de Analizar (antes de los resultados) */}
      {!analysisResult && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-500" />
            3. Analizar documento{pdfFiles.length > 1 ? 's' : ''}
          </h2>
          
          <button
            onClick={analizarPdf}
            disabled={!canAnalyze}
            className={`
              w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all text-lg
              ${canAnalyze
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {status === 'analyzing' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analizando {pdfFiles.length} documento{pdfFiles.length > 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Buscar códigos en {pdfFiles.length > 0 ? pdfFiles.length : 'los'} manifiesto{pdfFiles.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            Primero analizaremos {pdfFiles.length > 1 ? 'los documentos' : 'el documento'} para verificar qué códigos se encuentran antes de generar {pdfFiles.length > 1 ? 'los PDFs resaltados' : 'el PDF resaltado'}
          </p>
        </div>
      )}
      
      {/* RESULTADOS DEL ANÁLISIS */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Header de resultados */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Resultados del Análisis
            </h2>
            <button
              onClick={nuevaBusqueda}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Nueva búsqueda
            </button>
          </div>
          
          {/* Estadísticas principales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Códigos buscados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysisResult.totalBuscados}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm text-green-600 dark:text-green-400">Encontrados</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {analysisResult.totalEncontrados}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">No encontrados</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {analysisResult.totalNoEncontrados}
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${
              analysisResult.tasaExito >= 80 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : analysisResult.tasaExito >= 50
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tasa de éxito</p>
              <p className={`text-2xl font-bold ${
                analysisResult.tasaExito >= 80 
                  ? 'text-green-700 dark:text-green-300' 
                  : analysisResult.tasaExito >= 50
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {analysisResult.tasaExito.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Info adicional */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>📄 {analysisResult.paginasDocumento} páginas en el documento</span>
            <span>⏱️ Analizado en {analysisResult.tiempoProcesamiento}ms</span>
            {analysisResult.duplicadosIngresados.length > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400">
                ⚠️ {analysisResult.duplicadosIngresados.length} duplicados ignorados
              </span>
            )}
          </div>
          
          {/* Códigos NO encontrados */}
          {analysisResult.codigosNoEncontrados.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
              <div className="w-full px-4 py-3 flex items-center justify-between bg-red-50 dark:bg-red-900/20">
                <button
                  onClick={() => setShowNoEncontrados(!showNoEncontrados)}
                  className="flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded px-2 py-1 transition-colors"
                >
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-800 dark:text-red-300">
                    Códigos NO encontrados ({analysisResult.codigosNoEncontrados.length})
                  </span>
                  {showNoEncontrados ? <ChevronUp className="h-5 w-5 text-red-500" /> : <ChevronDown className="h-5 w-5 text-red-500" />}
                </button>
                <button
                  onClick={copiarNoEncontrados}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"
                  title="Copiar códigos no encontrados"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              
              {showNoEncontrados && (
                <div className="p-4">
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                    Estos códigos no se encontraron en el manifiesto. Usa el número (#) para ubicar el código en tu factura.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-red-200 dark:border-red-800">
                          <th className="pb-2 font-medium w-16"># Línea</th>
                          <th className="pb-2 font-medium">Código</th>
                          <th className="pb-2 font-medium">Sugerencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                        {analysisResult.codigosNoEncontrados.map((item) => (
                          <tr key={item.numero} className="text-gray-900 dark:text-white">
                            <td className="py-2">
                              <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold">
                                #{item.numero}
                              </span>
                            </td>
                            <td className="py-2 font-mono">
                              <span className="inline-flex items-center">
                                <XCircle className="h-4 w-4 text-red-500 mr-2" />
                                {item.codigo}
                              </span>
                            </td>
                            <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                              Revisa línea #{item.numero} en tu factura
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Códigos encontrados */}
          {analysisResult.codigosEncontrados.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 overflow-hidden">
              <button
                onClick={() => setShowEncontrados(!showEncontrados)}
                className="w-full px-4 py-3 flex items-center justify-between bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-800 dark:text-green-300">
                    Códigos encontrados ({analysisResult.codigosEncontrados.length})
                  </span>
                </div>
                {showEncontrados ? <ChevronUp className="h-5 w-5 text-green-500" /> : <ChevronDown className="h-5 w-5 text-green-500" />}
              </button>
              
              {showEncontrados && (
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          <th className="pb-2 font-medium w-16"># Línea</th>
                          <th className="pb-2 font-medium">Código</th>
                          <th className="pb-2 font-medium">Página(s) PDF</th>
                          <th className="pb-2 font-medium text-center">Veces</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {analysisResult.codigosEncontrados.map((item) => (
                          <tr key={item.numero} className="text-gray-900 dark:text-white">
                            <td className="py-2">
                              <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold">
                                #{item.numero}
                              </span>
                            </td>
                            <td className="py-2 font-mono">
                              <span className="inline-flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                {item.codigo}
                              </span>
                            </td>
                            <td className="py-2 text-gray-600 dark:text-gray-400">
                              Pág. {item.paginas.join(', ')}
                            </td>
                            <td className="py-2 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                                {item.frecuencia}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Sección de Guardar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Download className="h-5 w-5 text-green-500" />
              4. Guardar Manifiesto
            </h2>
            
            {analysisResult.totalEncontrados === 0 ? (
              <div className="text-center py-6">
                <XCircle className="h-12 w-12 text-red-300 dark:text-red-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No se encontró ningún código. Verifica los códigos ingresados y vuelve a intentar.
                </p>
              </div>
            ) : (
              <>
                {/* Selector de empresa */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecciona el cliente
                  </label>
                  <select
                    value={clienteSeleccionado}
                    onChange={(e) => setClienteSeleccionado(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    title="Seleccionar cliente"
                  >
                    <option value="">-- Seleccionar cliente --</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre} (NIT: {cliente.nit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Link para crear nuevo cliente */}
                <a
                  href="/clientes"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
                >
                  + Crear nuevo cliente en la sección Clientes
                </a>

                <button
                  onClick={guardarManifiesto}
                  disabled={!canDownload || !clienteSeleccionado}
                  className={`
                    w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                    ${canDownload && clienteSeleccionado
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {status === 'downloading' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-5 w-5" />
                      Guardar Manifiesto Resaltado
                    </>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  El manifiesto con los {analysisResult.totalEncontrados} códigos resaltados se guardará asociado al cliente seleccionado.
                </p>
              </>
            )}
          </div>
          
          {/* Nota sobre integridad */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
            <p className="text-blue-800 dark:text-blue-300">
              <strong>✓ Integridad garantizada:</strong> El documento original de la DIAN no se modifica. 
              Solo se agregan anotaciones de resaltado que preservan la validez legal del documento. 
              El PDF descargado tiene exactamente <strong>{analysisResult.paginasDocumento} páginas</strong> (igual que el original).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResaltarPage

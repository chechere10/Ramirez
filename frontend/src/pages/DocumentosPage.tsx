import { FileText, Search, Trash2, Download, Highlighter, CheckCircle, Calendar, FolderOpen, ChevronRight, ArrowLeft, Users, Building2, Loader2, RefreshCw, Eye, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://100.71.152.76:8005'

// Estructura de documentos del backend
interface Documento {
  id: string
  nombre: string
  nombre_original: string
  fecha_guardado: string
  total_paginas: number
  codigos_encontrados: number
  codigos_buscados: number
  color_resaltado: string
  tamaño: string
}

interface Cliente {
  id: string
  nombre: string
  nit: string
  total_documentos: number
}

const colorClasses: Record<string, string> = {
  amarillo: 'bg-yellow-400',
  verde: 'bg-green-400',
  azul: 'bg-blue-400',
  rosa: 'bg-pink-400',
  naranja: 'bg-orange-400',
  cian: 'bg-cyan-400',
  rojo: 'bg-red-400',
  violeta: 'bg-violet-400',
}

export function DocumentosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros de fecha
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  
  // Preview PDF
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Cargar clientes desde localStorage y complementar con info del backend
  const cargarClientes = async () => {
    setLoading(true)
    setError(null)
    try {
      // Cargar clientes del localStorage
      const savedClientes = localStorage.getItem('manifesto_clientes')
      let clientesLocal: Array<{id: string, nombre: string, nit: string, totalDocumentos?: number}> = []
      
      if (savedClientes) {
        try {
          clientesLocal = JSON.parse(savedClientes)
        } catch {
          clientesLocal = []
        }
      }
      
      // Si no hay clientes en localStorage, mostrar lista vacía sin error
      if (clientesLocal.length === 0) {
        setClientes([])
        setLoading(false)
        return
      }
      
      // Intentar cargar info de documentos del backend (opcional)
      let docsMap = new Map<string, number>()
      try {
        const response = await fetch(`${API_URL}/api/highlight/clientes`, {
          signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
        })
        if (response.ok) {
          const backendData = await response.json()
          const clientesBackend = backendData.clientes || []
          clientesBackend.forEach((c: {id: string, total_documentos: number}) => {
            docsMap.set(c.id, c.total_documentos)
          })
        }
      } catch {
        // Si el backend no está disponible, continuar sin conteo de documentos
        console.log('Backend no disponible, continuando en modo offline')
      }
      
      // Combinar: usar clientes del localStorage pero con conteo de docs del backend
      const clientesCombinados = clientesLocal.map(c => ({
        id: c.id,
        nombre: c.nombre,
        nit: c.nit,
        total_documentos: docsMap.get(c.id) || 0
      }))
      
      setClientes(clientesCombinados)
    } catch (err) {
      console.error('Error:', err)
      // No mostrar error, solo dejar lista vacía
      setClientes([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar documentos de un cliente
  const cargarDocumentos = async (clienteId: string) => {
    setLoadingDocs(true)
    try {
      const response = await fetch(`${API_URL}/api/highlight/clientes/${clienteId}/documentos`, {
        signal: AbortSignal.timeout(5000)
      })
      if (!response.ok) throw new Error('Error cargando documentos')
      const data = await response.json()
      setDocumentos(data.documentos || [])
    } catch (err) {
      console.error('Error:', err)
      setDocumentos([])
      // No mostrar alerta, solo dejar vacío
    } finally {
      setLoadingDocs(false)
    }
  }

  // Descargar documento
  const descargarDocumento = async (doc: Documento) => {
    if (!clienteActivo) return
    try {
      const response = await fetch(
        `${API_URL}/api/highlight/clientes/${clienteActivo.id}/documentos/${doc.id}/descargar`
      )
      if (!response.ok) throw new Error('Error descargando')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.nombre
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error descargando:', err)
      alert('Error al descargar el documento')
    }
  }

  // Visualizar documento (sin descargar)
  const visualizarDocumento = async (doc: Documento) => {
    if (!clienteActivo) return
    setLoadingPreview(true)
    setPreviewDoc(doc)
    try {
      const response = await fetch(
        `${API_URL}/api/highlight/clientes/${clienteActivo.id}/documentos/${doc.id}/descargar`
      )
      if (!response.ok) throw new Error('Error cargando preview')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (err) {
      console.error('Error preview:', err)
      alert('Error al cargar el documento')
      setPreviewDoc(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  // Cerrar preview
  const cerrarPreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setPreviewDoc(null)
  }

  // Eliminar documento
  const eliminarDocumento = async (doc: Documento) => {
    if (!clienteActivo) return
    if (!confirm(`¿Está seguro de eliminar "${doc.nombre}"?`)) return
    
    try {
      const response = await fetch(
        `${API_URL}/api/highlight/clientes/${clienteActivo.id}/documentos/${doc.id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Error eliminando')
      cargarDocumentos(clienteActivo.id)
    } catch (err) {
      console.error('Error eliminando:', err)
      alert('Error al eliminar el documento')
    }
  }

  // Cargar clientes al montar
  useEffect(() => {
    cargarClientes()
  }, [])

  // Cargar documentos cuando se selecciona un cliente
  useEffect(() => {
    if (clienteActivo) {
      cargarDocumentos(clienteActivo.id)
    }
  }, [clienteActivo])

  // Seleccionar cliente
  const seleccionarCliente = (cliente: Cliente) => {
    setClienteActivo(cliente)
    setSearchTerm('')
  }

  // Volver a lista de clientes
  const volverAClientes = () => {
    setClienteActivo(null)
    setDocumentos([])
    setSearchTerm('')
    cargarClientes()
  }

  // Formatear fecha
  const formatearFecha = (fechaISO: string) => {
    try {
      const fecha = new Date(fechaISO)
      return fecha.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return fechaISO
    }
  }

  // Filtrar clientes
  const clientesFiltrados = clientes.filter((cliente) => {
    if (!searchTerm) return true
    return cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cliente.nit.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Filtrar documentos por búsqueda y fechas
  const documentosFiltrados = documentos.filter((doc) => {
    // Filtro por texto
    const matchTexto = !searchTerm || 
      doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.nombre_original.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por fecha desde
    let matchFechaDesde = true
    if (fechaDesde) {
      const docFecha = new Date(doc.fecha_guardado)
      const desde = new Date(fechaDesde)
      matchFechaDesde = docFecha >= desde
    }
    
    // Filtro por fecha hasta
    let matchFechaHasta = true
    if (fechaHasta) {
      const docFecha = new Date(doc.fecha_guardado)
      const hasta = new Date(fechaHasta + 'T23:59:59')
      matchFechaHasta = docFecha <= hasta
    }
    
    return matchTexto && matchFechaDesde && matchFechaHasta
  })

  // Vista de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Cargando documentos...</span>
      </div>
    )
  }

  // Vista de error
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={cargarClientes}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    )
  }

  // Vista de carpetas (clientes)
  if (!clienteActivo) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documentos</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manifiestos organizados por cliente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cargarClientes}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title="Actualizar"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <NavLink
              to="/resaltar"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Highlighter className="h-4 w-4" />
              Nuevo Manifiesto
            </NavLink>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {clientesFiltrados.length > 0 && (
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
              {clientesFiltrados.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => seleccionarCliente(cliente)}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                      <FolderOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {cliente.nombre}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    NIT: {cliente.nit}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {cliente.total_documentos} {cliente.total_documentos === 1 ? 'documento' : 'documentos'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {clientesFiltrados.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchTerm ? 'No se encontraron clientes' : 'No hay documentos guardados'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm 
                ? 'Intenta con otro término de búsqueda' 
                : 'Guarda manifiestos resaltados desde la sección Manifiestos.'}
            </p>
            <NavLink
              to="/resaltar"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Highlighter className="h-4 w-4" />
              Ir a Manifiestos
            </NavLink>
          </div>
        )}
      </div>
    )
  }

  // Vista de documentos dentro de un cliente
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={volverAClientes}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Volver a clientes"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{clienteActivo.nombre}</h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              NIT: {clienteActivo.nit} • {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'}
            </p>
          </div>
        </div>
        <NavLink
          to="/resaltar"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Highlighter className="h-4 w-4" />
          Agregar Manifiesto
        </NavLink>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documentos de este cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          {/* Filtros de fecha */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                title="Limpiar filtros de fecha"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {loadingDocs && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">Cargando documentos...</span>
        </div>
      )}

      {!loadingDocs && documentosFiltrados.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No hay documentos para este cliente
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Guarda un manifiesto seleccionando este cliente.
          </p>
          <NavLink
            to="/resaltar"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Highlighter className="h-4 w-4" />
            Ir a Manifiestos
          </NavLink>
        </div>
      )}

      {!loadingDocs && documentosFiltrados.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Códigos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {documentosFiltrados.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{doc.tamaño} • {doc.total_paginas} páginas</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${colorClasses[doc.color_resaltado] || 'bg-yellow-400'}`}></span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{doc.color_resaltado}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {doc.codigos_encontrados}/{doc.codigos_buscados}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      {formatearFecha(doc.fecha_guardado)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => visualizarDocumento(doc)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                        title="Ver documento"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => descargarDocumento(doc)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                        title="Descargar"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => eliminarDocumento(doc)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Preview PDF */}
      {(previewDoc || loadingPreview) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[95vw] h-[95vh] flex flex-col">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {previewDoc?.nombre || 'Cargando...'}
                </h3>
                {previewDoc && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {previewDoc.tamaño} • {previewDoc.total_paginas} páginas • {previewDoc.codigos_encontrados}/{previewDoc.codigos_buscados} códigos
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {previewDoc && (
                  <button
                    onClick={() => descargarDocumento(previewDoc)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </button>
                )}
                <button
                  onClick={cerrarPreview}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Cerrar"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Contenido del PDF */}
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-500">Cargando documento...</span>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Vista previa del PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No se pudo cargar el documento</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentosPage

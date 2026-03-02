import { Search, FileText, Download, RefreshCw, AlertCircle } from 'lucide-react'
import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  CodeManager,
  SearchButton,
  SearchProgress,
  ResultsFilter,
  ResultsTable,
  ResultsStats,
} from '../components/search'
import { ExportModal } from '../components/export'
import type { FilterStatus, SearchResult } from '../components/search'
import type { ExportOptionsData } from '../components/export'
import { documentosService, busquedaService, type DocumentoResponse, type BusquedaResponse } from '../services/api'

interface ManifiestoOption {
  id: number
  nombre: string
  codigos?: number
}

export function BusquedaPage() {
  const [codigos, setCodigos] = useState<string[]>([])
  const [selectedManifiestoIds, setSelectedManifiestoIds] = useState<number[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'completed' | 'error'>('idle')
  const [searchProgress, setSearchProgress] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [currentCode, setCurrentCode] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [showExportModal, setShowExportModal] = useState(false)
  const [manifiestos, setManifiestos] = useState<ManifiestoOption[]>([])
  const [loadingManifiestos, setLoadingManifiestos] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Cargar manifiestos disponibles desde la API
  useEffect(() => {
    const cargarManifiestos = async () => {
      try {
        setLoadingManifiestos(true)
        const response = await documentosService.listar('manifiesto', 'completado', 0, 200)
        const manifiestosList: ManifiestoOption[] = response.items.map((doc: DocumentoResponse) => ({
          id: doc.id,
          nombre: doc.nombre,
          codigos: doc.paginas || 0, // usar paginas como aproximado si no hay conteo de códigos
        }))
        setManifiestos(manifiestosList)
      } catch (error) {
        console.error('Error cargando manifiestos:', error)
        setErrorMessage('Error al cargar la lista de manifiestos')
      } finally {
        setLoadingManifiestos(false)
      }
    }
    
    cargarManifiestos()
  }, [])

  // Statistics
  const stats = useMemo(() => {
    const found = results.filter((r) => r.estado === 'found').length
    const notFound = results.filter((r) => r.estado === 'not_found').length
    const partial = results.filter((r) => r.estado === 'partial').length
    return {
      total: results.length,
      found,
      notFound,
      partial,
    }
  }, [results])

  // Filter counts for ResultsFilter
  const filterCounts = useMemo(() => ({
    all: results.length,
    found: stats.found,
    notFound: stats.notFound,
    partial: stats.partial,
  }), [results.length, stats])

  const ejecutarBusqueda = useCallback(async () => {
    if (codigos.length === 0) {
      setErrorMessage('Debes ingresar al menos un código para buscar')
      return
    }

    setSearchStatus('searching')
    setSearchProgress(10)
    setProcessedCount(0)
    setResults([])
    setErrorMessage(null)
    setCurrentCode(codigos[0] || '')

    try {
      // Ejecutar búsqueda real en la API
      const manifiestoIds = selectedManifiestoIds.length > 0 ? selectedManifiestoIds : undefined
      
      setSearchProgress(30)
      setCurrentCode('Buscando en manifiestos...')
      
      const response: BusquedaResponse = await busquedaService.ejecutar(codigos, manifiestoIds, false)
      
      setSearchProgress(80)
      
      // Transformar resultados de la API al formato del componente
      const searchResults: SearchResult[] = response.resultados.map((r) => {
        let estado: SearchResult['estado']
        if (r.estado === 'encontrado') {
          estado = 'found'
        } else if (r.estado === 'parcial') {
          estado = 'partial'
        } else {
          estado = 'not_found'
        }
        
        // Obtener primera ubicación si existe
        const primeraUbicacion = r.encontrado_en?.[0]
        
        return {
          codigo: r.codigo_original,
          estado,
          pagina: primeraUbicacion?.pagina,
          frecuencia: r.frecuencia,
          similitud: r.estado === 'parcial' ? 85 : undefined,
          codigoSimilar: r.similares?.[0],
          documento: primeraUbicacion?.documento_nombre,
          documentoId: primeraUbicacion?.documento_id,
          ubicaciones: r.encontrado_en,
        }
      })
      
      setResults(searchResults)
      setProcessedCount(codigos.length)
      setSearchProgress(100)
      setSearchStatus('completed')
      setCurrentCode('')
      
    } catch (error) {
      console.error('Error en búsqueda:', error)
      setSearchStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Error al ejecutar la búsqueda')
    }
  }, [codigos, selectedManifiestoIds])

  const handleNewSearch = useCallback(() => {
    setSearchStatus('idle')
    setSearchProgress(0)
    setProcessedCount(0)
    setCurrentCode('')
    setResults([])
    setFilter('all')
    setErrorMessage(null)
  }, [])

  const handleViewInPdf = useCallback((result: SearchResult) => {
    // TODO: Integrate with PDF viewer in Phase 5.5
    console.log('View in PDF:', result)
    window.location.href = `/visor?doc=1&code=${result.codigo}&page=${result.pagina}`
  }, [])

  const handleOpenExportModal = useCallback(() => {
    setShowExportModal(true)
  }, [])

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false)
  }, [])

  const handleExport = useCallback(async (options: ExportOptionsData) => {
    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    // In real implementation, call API endpoint
    console.log('Exporting with options:', options)
    console.log('Results to export:', results)
    
    // Simulate download
    const filename = options.format === 'pdf' 
      ? 'resultados_busqueda.pdf' 
      : 'resultados_busqueda.csv'
    
    alert(`Descarga iniciada: ${filename}\n\nFormato: ${options.format.toUpperCase()}\nIncluir estadísticas: ${options.includeStats ? 'Sí' : 'No'}`)
  }, [results])

  // Export preview data
  const exportPreviewData = useMemo(() => {
    const selectedNames = manifiestos
      .filter((m) => selectedManifiestoIds.includes(m.id))
      .map((m) => m.nombre)
      .join(', ')
    return {
      documentName: selectedNames || 'Todos los manifiestos',
      totalCodes: stats.total,
      foundCodes: stats.found,
      notFoundCodes: stats.notFound,
      partialCodes: stats.partial,
      searchDate: new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  }, [selectedManifiestoIds, manifiestos, stats])

  const handleManifiestoToggle = useCallback((id: number) => {
    setSelectedManifiestoIds(prev => 
      prev.includes(id) 
        ? prev.filter(mId => mId !== id)
        : [...prev, id]
    )
  }, [])

  const hasResults = results.length > 0
  const isSearching = searchStatus === 'searching'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Búsqueda de Códigos</h1>
          <p className="text-gray-500 mt-1">
            Cruza códigos de facturas contra manifiestos cargados
          </p>
        </div>
        {hasResults && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenExportModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button
              onClick={handleNewSearch}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <RefreshCw className="h-4 w-4" />
              Nueva búsqueda
            </button>
          </div>
        )}
      </div>

      {/* Main content - 2 columns on xl screens */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left panel - Input (2/5) */}
        <div className={`space-y-4 ${hasResults ? 'xl:col-span-2' : 'xl:col-span-3 xl:col-start-2'}`}>
          {/* Error message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Manifest selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Manifiestos donde buscar
            </label>
            {loadingManifiestos ? (
              <div className="text-center py-4 text-gray-500">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                Cargando manifiestos...
              </div>
            ) : manifiestos.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No hay manifiestos cargados</p>
                <a href="/cargar" className="text-blue-600 text-sm hover:underline">
                  Ir a cargar manifiestos
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedManifiestoIds.length === 0}
                    onChange={() => setSelectedManifiestoIds([])}
                    disabled={isSearching}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 font-medium">Buscar en todos ({manifiestos.length})</span>
                </label>
                <div className="border-t border-gray-100 pt-2">
                  {manifiestos.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedManifiestoIds.includes(m.id)}
                        onChange={() => handleManifiestoToggle(m.id)}
                        disabled={isSearching}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 truncate" title={m.nombre}>
                        {m.nombre}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Code Manager */}
          <div className={isSearching ? 'opacity-50 pointer-events-none' : ''}>
            <CodeManager
              codes={codigos}
              onCodesChange={setCodigos}
              maxCodes={10000}
            />
          </div>

          {/* Search Progress */}
          {searchStatus !== 'idle' && (
            <SearchProgress
              status={searchStatus}
              progress={searchProgress}
              currentCode={currentCode}
              processedCount={processedCount}
              totalCount={codigos.length}
            />
          )}

          {/* Search Button */}
          <SearchButton
            onClick={ejecutarBusqueda}
            disabled={isSearching}
            loading={isSearching}
            codesCount={codigos.length}
          />
        </div>

        {/* Right panel - Results (3/5) */}
        {hasResults && (
          <div className="xl:col-span-3 space-y-4">
            {/* Stats */}
            <ResultsStats
              total={stats.total}
              found={stats.found}
              notFound={stats.notFound}
              partial={stats.partial}
            />

            {/* Results panel */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Search className="h-5 w-5 text-gray-400" />
                    Resultados de Búsqueda
                  </h2>
                  <ResultsFilter
                    value={filter}
                    onChange={setFilter}
                    counts={filterCounts}
                  />
                </div>
              </div>

              <div className="p-4">
                <ResultsTable
                  results={results}
                  filter={filter}
                  onViewInPdf={handleViewInPdf}
                  pageSize={15}
                />
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no results yet */}
        {!hasResults && searchStatus === 'idle' && (
          <div className="xl:col-span-3 xl:col-start-2 hidden xl:block">
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Search className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                Ingresa códigos y ejecuta la búsqueda
              </p>
              <p className="text-sm text-gray-400">
                Los resultados aparecerán aquí con estadísticas detalladas
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={handleCloseExportModal}
        onExport={handleExport}
        previewData={exportPreviewData}
      />
    </div>
  )
}

export default BusquedaPage
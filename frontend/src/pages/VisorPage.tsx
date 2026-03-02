import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Upload, Search, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { PdfViewer, PdfResultsPanel } from '../components/pdf'
import type { Highlight } from '../components/pdf'
import type { CodeResult } from '../components/pdf'

// Simulated data for demo purposes
const MOCK_PDF_URL = '/sample.pdf'

const MOCK_RESULTS: CodeResult[] = [
  { id: '1', codigo: 'ABC123456', estado: 'found', pagina: 5, frecuencia: 2, highlightId: 'h1' },
  { id: '2', codigo: 'DEF789012', estado: 'found', pagina: 12, frecuencia: 1, highlightId: 'h2' },
  { id: '3', codigo: 'GHI345678', estado: 'found', pagina: 23, frecuencia: 3, highlightId: 'h3' },
  { id: '4', codigo: 'JKL901234', estado: 'partial', pagina: 8, frecuencia: 1, highlightId: 'h4' },
  { id: '5', codigo: 'MNO567890', estado: 'partial', pagina: 15, frecuencia: 1, highlightId: 'h5' },
  { id: '6', codigo: 'PQR123789', estado: 'not_found', frecuencia: 0 },
  { id: '7', codigo: 'STU456012', estado: 'not_found', frecuencia: 0 },
  { id: '8', codigo: 'VWX789345', estado: 'not_found', frecuencia: 0 },
]

const MOCK_HIGHLIGHTS: Highlight[] = [
  { id: 'h1', page: 5, x: 20, y: 30, width: 15, height: 2, color: 'rgba(76, 175, 80, 0.4)', label: 'ABC123456' },
  { id: 'h2', page: 12, x: 45, y: 55, width: 15, height: 2, color: 'rgba(76, 175, 80, 0.4)', label: 'DEF789012' },
  { id: 'h3', page: 23, x: 10, y: 70, width: 15, height: 2, color: 'rgba(76, 175, 80, 0.4)', label: 'GHI345678' },
  { id: 'h4', page: 8, x: 60, y: 40, width: 15, height: 2, color: 'rgba(255, 193, 7, 0.4)', label: 'JKL901234' },
  { id: 'h5', page: 15, x: 30, y: 25, width: 15, height: 2, color: 'rgba(255, 193, 7, 0.4)', label: 'MNO567890' },
]

export function VisorPage() {
  const [searchParams] = useSearchParams()
  const documentId = searchParams.get('doc')
  const busquedaId = searchParams.get('busqueda')

  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // In a real app, fetch PDF URL and results based on documentId and busquedaId
  const pdfUrl = documentId ? `/api/documentos/${documentId}/download` : MOCK_PDF_URL
  const results = useMemo(() => MOCK_RESULTS, [])
  const highlights = useMemo(() => MOCK_HIGHLIGHTS, [])

  const handleResultClick = useCallback((result: CodeResult) => {
    setSelectedResultId(result.id)
    if (result.highlightId) {
      setSelectedHighlightId(result.highlightId)
    }
    if (result.pagina) {
      setCurrentPage(result.pagina)
    }
  }, [])

  const handleViewInPdf = useCallback((result: CodeResult) => {
    if (result.highlightId) {
      setSelectedHighlightId(result.highlightId)
    }
    if (result.pagina) {
      setCurrentPage(result.pagina)
    }
  }, [])

  const handleHighlightClick = useCallback((highlight: Highlight) => {
    setSelectedHighlightId(highlight.id)
    const result = results.find((r) => r.highlightId === highlight.id)
    if (result) {
      setSelectedResultId(result.id)
    }
  }, [results])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleDownload = useCallback(() => {
    // TODO: Implement download with API
    alert('Descargar PDF (se implementará con la API)')
  }, [])

  // No document selected state
  if (!documentId && !MOCK_PDF_URL) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-8">
        <FileText className="h-20 w-20 text-gray-300 mb-6" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          No hay documento seleccionado
        </h2>
        <p className="text-gray-500 text-center max-w-md mb-6">
          Selecciona un documento desde la página de documentos o realiza una búsqueda 
          para ver el PDF con los códigos resaltados.
        </p>
        <div className="flex gap-4">
          <a
            href="/documentos"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Upload className="h-4 w-4" />
            Ver documentos
          </a>
          <a
            href="/busqueda"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Search className="h-4 w-4" />
            Nueva búsqueda
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <div>
            <h1 className="font-semibold text-gray-900">Visor de PDF</h1>
            <p className="text-xs text-gray-500">
              {documentId ? `Documento: ${documentId}` : 'Vista de demostración'}
              {busquedaId && ` • Búsqueda: ${busquedaId}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPanel(!showPanel)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          {showPanel ? (
            <>
              <PanelRightClose className="h-4 w-4" />
              Ocultar panel
            </>
          ) : (
            <>
              <PanelRightOpen className="h-4 w-4" />
              Mostrar resultados
            </>
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div className={`flex-1 ${showPanel ? '' : 'w-full'}`}>
          <PdfViewer
            file={pdfUrl}
            highlights={highlights}
            selectedHighlightId={selectedHighlightId}
            initialPage={currentPage}
            onPageChange={handlePageChange}
            onHighlightClick={handleHighlightClick}
            onDownload={handleDownload}
          />
        </div>

        {/* Results Panel */}
        {showPanel && (
          <div className="w-80 flex-shrink-0">
            <PdfResultsPanel
              results={results}
              selectedResultId={selectedResultId}
              onResultClick={handleResultClick}
              onViewInPdf={handleViewInPdf}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default VisorPage

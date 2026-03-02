import { CheckCircle, XCircle, AlertCircle, Eye, ChevronRight } from 'lucide-react'

export interface CodeResult {
  id: string
  codigo: string
  estado: 'found' | 'not_found' | 'partial'
  pagina?: number
  frecuencia: number
  highlightId?: string
}

export interface PdfResultsPanelProps {
  results: CodeResult[]
  selectedResultId?: string | null
  onResultClick: (result: CodeResult) => void
  onViewInPdf?: (result: CodeResult) => void
}

export function PdfResultsPanel({
  results,
  selectedResultId,
  onResultClick,
  onViewInPdf,
}: PdfResultsPanelProps) {
  const foundResults = results.filter((r) => r.estado === 'found')
  const notFoundResults = results.filter((r) => r.estado === 'not_found')
  const partialResults = results.filter((r) => r.estado === 'partial')

  const getStatusIcon = (estado: CodeResult['estado']) => {
    switch (estado) {
      case 'found':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'not_found':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBg = (estado: CodeResult['estado'], isSelected: boolean) => {
    if (isSelected) {
      return 'bg-blue-100 border-blue-300'
    }
    switch (estado) {
      case 'found':
        return 'hover:bg-green-50'
      case 'not_found':
        return 'hover:bg-red-50'
      case 'partial':
        return 'hover:bg-yellow-50'
    }
  }

  const ResultItem = ({ result }: { result: CodeResult }) => {
    const isSelected = result.id === selectedResultId
    return (
      <button
        type="button"
        onClick={() => onResultClick(result)}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b border-gray-100 transition-colors ${getStatusBg(
          result.estado,
          isSelected
        )} ${isSelected ? 'border-l-2 border-l-blue-500' : ''}`}
      >
        {getStatusIcon(result.estado)}
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm text-gray-900 truncate">{result.codigo}</p>
          {result.pagina && (
            <p className="text-xs text-gray-500">Pág. {result.pagina}</p>
          )}
        </div>
        {result.estado !== 'not_found' && onViewInPdf && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewInPdf(result)
            }}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="Ver en PDF"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </button>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Resultados</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {results.length} códigos • {foundResults.length} encontrados
        </p>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {/* Found */}
        {foundResults.length > 0 && (
          <div>
            <div className="px-3 py-2 bg-green-50 border-b border-green-100 sticky top-0">
              <span className="text-xs font-medium text-green-700">
                Encontrados ({foundResults.length})
              </span>
            </div>
            {foundResults.map((result) => (
              <ResultItem key={result.id} result={result} />
            ))}
          </div>
        )}

        {/* Partial */}
        {partialResults.length > 0 && (
          <div>
            <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-100 sticky top-0">
              <span className="text-xs font-medium text-yellow-700">
                Parciales ({partialResults.length})
              </span>
            </div>
            {partialResults.map((result) => (
              <ResultItem key={result.id} result={result} />
            ))}
          </div>
        )}

        {/* Not Found */}
        {notFoundResults.length > 0 && (
          <div>
            <div className="px-3 py-2 bg-red-50 border-b border-red-100 sticky top-0">
              <span className="text-xs font-medium text-red-700">
                No encontrados ({notFoundResults.length})
              </span>
            </div>
            {notFoundResults.map((result) => (
              <ResultItem key={result.id} result={result} />
            ))}
          </div>
        )}

        {results.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No hay resultados</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PdfResultsPanel

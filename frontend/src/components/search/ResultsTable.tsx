import { useState, useMemo, useCallback } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { FilterStatus } from './ResultsFilter'

export interface SearchResultLocation {
  documento_id: number
  documento_nombre: string
  pagina: number
  linea?: number
  contexto?: string
}

export interface SearchResult {
  codigo: string
  estado: 'found' | 'not_found' | 'partial'
  pagina?: number
  frecuencia: number
  similitud?: number
  codigoSimilar?: string
  documento?: string
  documentoId?: number
  ubicaciones?: SearchResultLocation[]
}

export type SortField = 'codigo' | 'estado' | 'pagina' | 'frecuencia'
export type SortDirection = 'asc' | 'desc'

export interface ResultsTableProps {
  results: SearchResult[]
  filter: FilterStatus
  onViewInPdf?: (result: SearchResult) => void
  pageSize?: number
}

export function ResultsTable({
  results,
  filter,
  onViewInPdf,
  pageSize = 20,
}: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('codigo')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter results
  const filteredResults = useMemo(() => {
    if (filter === 'all') return results
    return results.filter((r) => {
      if (filter === 'found') return r.estado === 'found'
      if (filter === 'not_found') return r.estado === 'not_found'
      if (filter === 'partial') return r.estado === 'partial'
      return true
    })
  }, [results, filter])

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'codigo':
          comparison = a.codigo.localeCompare(b.codigo)
          break
        case 'estado':
          const estadoOrder = { found: 0, partial: 1, not_found: 2 }
          comparison = estadoOrder[a.estado] - estadoOrder[b.estado]
          break
        case 'pagina':
          comparison = (a.pagina ?? Infinity) - (b.pagina ?? Infinity)
          break
        case 'frecuencia':
          comparison = a.frecuencia - b.frecuencia
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredResults, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedResults.length / pageSize)
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedResults.slice(start, start + pageSize)
  }, [sortedResults, currentPage, pageSize])

  // Reset page when filter changes
  useMemo(() => {
    setCurrentPage(1)
  }, [filter])

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('asc')
      return field
    })
  }, [])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-300" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-600" />
    )
  }

  const getStatusBadge = (estado: SearchResult['estado'], similitud?: number) => {
    switch (estado) {
      case 'found':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" />
            Encontrado
          </span>
        )
      case 'not_found':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="h-3 w-3" />
            No encontrado
          </span>
        )
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <AlertCircle className="h-3 w-3" />
            Parcial {similitud && `(${similitud}%)`}
          </span>
        )
    }
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No hay resultados para mostrar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('codigo')}
              >
                <div className="flex items-center gap-1">
                  Código
                  {getSortIcon('codigo')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('estado')}
              >
                <div className="flex items-center gap-1">
                  Estado
                  {getSortIcon('estado')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('pagina')}
              >
                <div className="flex items-center gap-1">
                  Página
                  {getSortIcon('pagina')}
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('frecuencia')}
              >
                <div className="flex items-center gap-1">
                  Frecuencia
                  {getSortIcon('frecuencia')}
                </div>
              </th>
              {onViewInPdf && (
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acción
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedResults.map((result, index) => (
              <tr
                key={`${result.codigo}-${index}`}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>
                    <code className="font-mono text-sm text-gray-900">{result.codigo}</code>
                    {result.codigoSimilar && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Similar a: <code className="font-mono">{result.codigoSimilar}</code>
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(result.estado, result.similitud)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {result.pagina ? `Pág. ${result.pagina}` : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {result.frecuencia > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-gray-100 font-medium">
                      {result.frecuencia}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                {onViewInPdf && (
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {result.estado !== 'not_found' && (
                      <button
                        type="button"
                        onClick={() => onViewInPdf(result)}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-600">
            Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, sortedResults.length)} de{' '}
            <span className="font-medium">{sortedResults.length.toLocaleString()}</span> resultados
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Primera página"
            >
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-2" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Última página"
            >
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultsTable

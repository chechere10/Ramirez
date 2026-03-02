import { useState, useCallback, useMemo } from 'react'
import {
  Search,
  Trash2,
  X,
  CheckCircle,
  Edit2,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

export interface CodeListProps {
  codes: string[]
  onRemoveCode: (code: string) => void
  onRemoveAll: () => void
  onUpdateCode?: (oldCode: string, newCode: string) => void
  readOnly?: boolean
  pageSize?: number
}

export function CodeList({
  codes,
  onRemoveCode,
  onRemoveAll,
  onUpdateCode,
  readOnly = false,
  pageSize = 20,
}: CodeListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())

  // Filtrar códigos
  const filteredCodes = useMemo(() => {
    if (!searchTerm) return codes
    const term = searchTerm.toUpperCase()
    return codes.filter((code) => code.includes(term))
  }, [codes, searchTerm])

  // Paginación
  const totalPages = Math.ceil(filteredCodes.length / pageSize)
  const paginatedCodes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCodes.slice(start, start + pageSize)
  }, [filteredCodes, currentPage, pageSize])

  // Resetear página cuando cambian los códigos
  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages))
    }
  }, [currentPage, totalPages])

  const handleStartEdit = useCallback((code: string) => {
    setEditingCode(code)
    setEditValue(code)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editingCode || !onUpdateCode) return

    const normalized = editValue.trim().toUpperCase().replace(/[\s-]+/g, '').replace(/[^A-Z0-9]/g, '')

    if (normalized && normalized !== editingCode && normalized.length >= 2) {
      onUpdateCode(editingCode, normalized)
    }

    setEditingCode(null)
    setEditValue('')
  }, [editingCode, editValue, onUpdateCode])

  const handleCancelEdit = useCallback(() => {
    setEditingCode(null)
    setEditValue('')
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedCodes.size === paginatedCodes.length) {
      setSelectedCodes(new Set())
    } else {
      setSelectedCodes(new Set(paginatedCodes))
    }
  }, [paginatedCodes, selectedCodes])

  const handleToggleSelect = useCallback((code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }, [])

  const handleRemoveSelected = useCallback(() => {
    if (selectedCodes.size === 0) return
    if (confirm(`¿Eliminar ${selectedCodes.size} código(s) seleccionado(s)?`)) {
      selectedCodes.forEach((code) => onRemoveCode(code))
      setSelectedCodes(new Set())
    }
  }, [selectedCodes, onRemoveCode])

  if (codes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No hay códigos agregados</p>
        <p className="text-sm">Usa las opciones arriba para agregar códigos</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {codes.length} código{codes.length !== 1 ? 's' : ''} total
            {filteredCodes.length !== codes.length && (
              <span className="text-gray-500">
                {' '}({filteredCodes.length} filtrado{filteredCodes.length !== 1 ? 's' : ''})
              </span>
            )}
          </span>
          {!readOnly && codes.length > 0 && (
            <button
              onClick={() => {
                if (confirm('¿Eliminar todos los códigos?')) {
                  onRemoveAll()
                }
              }}
              className="text-xs text-red-600 hover:text-red-700 hover:underline"
            >
              Eliminar todos
            </button>
          )}
        </div>

        {/* Búsqueda */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Filtrar códigos..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Acciones de selección */}
      {!readOnly && selectedCodes.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            {selectedCodes.size} seleccionado{selectedCodes.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleRemoveSelected}
            className="ml-auto text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Eliminar seleccionados
          </button>
        </div>
      )}

      {/* Lista de códigos */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        {!readOnly && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
            <input
              type="checkbox"
              checked={selectedCodes.size === paginatedCodes.length && paginatedCodes.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              aria-label="Seleccionar todos"
            />
            <span className="flex-1">Código</span>
            <span className="w-20 text-right">Acciones</span>
          </div>
        )}

        {/* Códigos */}
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {paginatedCodes.map((code, index) => (
            <div
              key={`${code}-${index}`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 group"
            >
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={selectedCodes.has(code)}
                  onChange={() => handleToggleSelect(code)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  aria-label={`Seleccionar ${code}`}
                />
              )}

              {editingCode === code ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit()
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    className="flex-1 px-2 py-1 text-sm font-mono border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Guardar"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                    title="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 font-mono text-sm text-gray-900">{code}</span>
                  {!readOnly && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onUpdateCode && (
                        <button
                          onClick={() => handleStartEdit(code)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveCode(code)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CodeList

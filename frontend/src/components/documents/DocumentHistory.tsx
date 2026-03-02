import { useState } from 'react'
import {
  FileText,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  Eye,
  Download,
  Trash2,
  MoreVertical,
  Clock,
} from 'lucide-react'
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react'

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'error'
export type DocumentTypeFilter = 'all' | 'manifiesto' | 'factura'

export interface DocumentHistoryItem {
  id: string
  fileName: string
  fileSize: number
  documentType: 'manifiesto' | 'factura'
  uploadDate: Date
  status: DocumentStatus
  pageCount?: number
  codesExtracted?: number
  errorMessage?: string
}

export interface DocumentHistoryProps {
  documents: DocumentHistoryItem[]
  isLoading?: boolean
  onView?: (doc: DocumentHistoryItem) => void
  onDownload?: (doc: DocumentHistoryItem) => void
  onDelete?: (doc: DocumentHistoryItem) => void
  onReprocess?: (doc: DocumentHistoryItem) => void
}

export function DocumentHistory({
  documents,
  isLoading = false,
  onView,
  onDownload,
  onDelete,
  onReprocess,
}: DocumentHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (hours < 1) return 'Hace unos minutos'
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`

    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const statusConfig = {
    pending: {
      label: 'Pendiente',
      color: 'bg-gray-100 text-gray-600',
      dot: 'bg-gray-400',
    },
    processing: {
      label: 'Procesando',
      color: 'bg-yellow-100 text-yellow-700',
      dot: 'bg-yellow-500',
    },
    completed: {
      label: 'Completado',
      color: 'bg-green-100 text-green-700',
      dot: 'bg-green-500',
    },
    error: {
      label: 'Error',
      color: 'bg-red-100 text-red-700',
      dot: 'bg-red-500',
    },
  }

  const typeConfig = {
    manifiesto: { label: 'Manifiesto', color: 'bg-blue-100 text-blue-700' },
    factura: { label: 'Factura', color: 'bg-purple-100 text-purple-700' },
  }

  // Filtrar documentos
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.documentType === typeFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filtro por tipo */}
        <Menu as="div" className="relative">
          <MenuButton className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
            <Filter className="h-4 w-4 text-gray-500" />
            <span>
              {typeFilter === 'all' ? 'Todos los tipos' : typeConfig[typeFilter].label}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </MenuButton>
          <Transition
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <MenuItems className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      focus ? 'bg-gray-100' : ''
                    }`}
                  >
                    Todos los tipos
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => setTypeFilter('manifiesto')}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      focus ? 'bg-gray-100' : ''
                    }`}
                  >
                    Solo Manifiestos
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => setTypeFilter('factura')}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      focus ? 'bg-gray-100' : ''
                    }`}
                  >
                    Solo Facturas
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Transition>
        </Menu>

        {/* Filtro por estado */}
        <Menu as="div" className="relative">
          <MenuButton className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>
              {statusFilter === 'all' ? 'Todos los estados' : statusConfig[statusFilter].label}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </MenuButton>
          <Transition
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <MenuItems className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      focus ? 'bg-gray-100' : ''
                    }`}
                  >
                    Todos los estados
                  </button>
                )}
              </MenuItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <MenuItem key={key}>
                  {({ focus }) => (
                    <button
                      onClick={() => setStatusFilter(key as DocumentStatus)}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        focus ? 'bg-gray-100' : ''
                      }`}
                    >
                      {config.label}
                    </button>
                  )}
                </MenuItem>
              ))}
            </MenuItems>
          </Transition>
        </Menu>
      </div>

      {/* Lista de documentos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 text-gray-500">
              <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              Cargando documentos...
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {documents.length === 0
                ? 'No hay documentos cargados'
                : 'No se encontraron documentos con los filtros aplicados'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Icono */}
                  <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          typeConfig[doc.documentType].color
                        }`}
                      >
                        {typeConfig[doc.documentType].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      {doc.pageCount && <span>{doc.pageCount} págs</span>}
                      {doc.codesExtracted !== undefined && (
                        <span>{doc.codesExtracted} códigos</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(doc.uploadDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estado y acciones */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                      statusConfig[doc.status].color
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[doc.status].dot}`} />
                    {statusConfig[doc.status].label}
                  </span>

                  {/* Menú de acciones */}
                  <Menu as="div" className="relative">
                    <MenuButton className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                      <MoreVertical className="h-4 w-4" />
                    </MenuButton>
                    <Transition
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <MenuItems className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        {onView && (
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => onView(doc)}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 ${
                                  focus ? 'bg-gray-100' : ''
                                }`}
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </button>
                            )}
                          </MenuItem>
                        )}
                        {onDownload && doc.status === 'completed' && (
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => onDownload(doc)}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 ${
                                  focus ? 'bg-gray-100' : ''
                                }`}
                              >
                                <Download className="h-4 w-4" />
                                Descargar
                              </button>
                            )}
                          </MenuItem>
                        )}
                        {onReprocess && doc.status === 'error' && (
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => onReprocess(doc)}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 ${
                                  focus ? 'bg-blue-50' : ''
                                }`}
                              >
                                <Clock className="h-4 w-4" />
                                Reprocesar
                              </button>
                            )}
                          </MenuItem>
                        )}
                        {onDelete && (
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => onDelete(doc)}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 ${
                                  focus ? 'bg-red-50' : ''
                                }`}
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </button>
                            )}
                          </MenuItem>
                        )}
                      </MenuItems>
                    </Transition>
                  </Menu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contador */}
      {filteredDocuments.length > 0 && (
        <p className="text-sm text-gray-500 text-right">
          Mostrando {filteredDocuments.length} de {documents.length} documento
          {documents.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default DocumentHistory

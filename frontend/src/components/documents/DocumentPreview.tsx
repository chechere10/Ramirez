import { FileText, Calendar, FileType, Hash, Eye, Download, Trash2 } from 'lucide-react'

export interface DocumentPreviewProps {
  id?: string
  fileName: string
  fileSize: number
  pageCount?: number
  uploadDate?: Date
  documentType?: 'manifiesto' | 'factura'
  codesExtracted?: number
  thumbnailUrl?: string
  onView?: () => void
  onDownload?: () => void
  onDelete?: () => void
  isProcessing?: boolean
}

export function DocumentPreview({
  fileName,
  fileSize,
  pageCount,
  uploadDate,
  documentType,
  codesExtracted,
  thumbnailUrl,
  onView,
  onDownload,
  onDelete,
  isProcessing = false,
}: DocumentPreviewProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const typeColors = {
    manifiesto: 'bg-blue-100 text-blue-700 border-blue-200',
    factura: 'bg-purple-100 text-purple-700 border-purple-200',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail / Preview */}
      <div className="relative h-40 bg-gray-100 flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Preview de ${fileName}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <FileText className="h-16 w-16" />
            <span className="text-xs">PDF</span>
          </div>
        )}

        {/* Badge de tipo */}
        {documentType && (
          <span
            className={`absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded-full border ${typeColors[documentType]}`}
          >
            {documentType === 'manifiesto' ? 'Manifiesto' : 'Factura'}
          </span>
        )}

        {/* Overlay de procesamiento */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Procesando...</span>
            </div>
          </div>
        )}

        {/* Acciones hover */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors group flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
            {onView && (
              <button
                onClick={onView}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-blue-50 transition-colors"
                title="Ver documento"
              >
                <Eye className="h-5 w-5 text-blue-600" />
              </button>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-green-50 transition-colors"
                title="Descargar"
              >
                <Download className="h-5 w-5 text-green-600" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="h-5 w-5 text-red-600" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info del documento */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate" title={fileName}>
          {fileName}
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <FileType className="h-3.5 w-3.5" />
            <span>{formatFileSize(fileSize)}</span>
          </div>

          {pageCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>{pageCount} página{pageCount !== 1 ? 's' : ''}</span>
            </div>
          )}

          {uploadDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(uploadDate)}</span>
            </div>
          )}

          {codesExtracted !== undefined && (
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              <span>{codesExtracted} código{codesExtracted !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Versión compacta para listas
export interface DocumentPreviewCompactProps {
  fileName: string
  fileSize: number
  documentType?: 'manifiesto' | 'factura'
  uploadDate?: Date
  status?: 'pending' | 'processing' | 'completed' | 'error'
  onView?: () => void
  onDelete?: () => void
}

export function DocumentPreviewCompact({
  fileName,
  fileSize,
  documentType,
  uploadDate,
  status = 'completed',
  onView,
  onDelete,
}: DocumentPreviewCompactProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-yellow-100 text-yellow-600',
    completed: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
  }

  const statusLabels = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Listo',
    error: 'Error',
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
          <FileText className="h-5 w-5 text-red-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatFileSize(fileSize)}</span>
            {documentType && (
              <>
                <span>•</span>
                <span className="capitalize">{documentType}</span>
              </>
            )}
            {uploadDate && (
              <>
                <span>•</span>
                <span>
                  {uploadDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
        {onView && (
          <button
            onClick={onView}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Ver"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default DocumentPreview

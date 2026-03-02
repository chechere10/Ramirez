import { CheckCircle, XCircle, Loader2, AlertTriangle, FileText } from 'lucide-react'

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'

export interface UploadProgressProps {
  fileName: string
  fileSize: number
  status: UploadStatus
  progress: number // 0-100
  errorMessage?: string
  onRetry?: () => void
  onCancel?: () => void
}

const statusConfig = {
  idle: {
    label: 'Esperando...',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    progressColor: 'bg-gray-300',
  },
  uploading: {
    label: 'Subiendo...',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    progressColor: 'bg-blue-500',
  },
  processing: {
    label: 'Procesando...',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    progressColor: 'bg-yellow-500',
  },
  completed: {
    label: 'Completado',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    progressColor: 'bg-green-500',
  },
  error: {
    label: 'Error',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    progressColor: 'bg-red-500',
  },
}

export function UploadProgress({
  fileName,
  fileSize,
  status,
  progress,
  errorMessage,
  onRetry,
  onCancel,
}: UploadProgressProps) {
  const config = statusConfig[status]

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const StatusIcon = () => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className={`h-5 w-5 ${config.textColor} animate-spin`} />
      case 'completed':
        return <CheckCircle className={`h-5 w-5 ${config.textColor}`} />
      case 'error':
        return <XCircle className={`h-5 w-5 ${config.textColor}`} />
      default:
        return <FileText className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor} border-${config.color}-200`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            <StatusIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatFileSize(fileSize)}
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${config.textColor}`}>
                  {config.label}
                </span>
                {(status === 'uploading' || status === 'processing') && (
                  <span className="text-xs text-gray-500">{progress}%</span>
                )}
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.progressColor} rounded-full transition-all duration-300 ease-out`}
                  style={{ width: `${status === 'completed' ? 100 : progress}%` }}
                />
              </div>
            </div>

            {/* Mensaje de error */}
            {status === 'error' && errorMessage && (
              <div className="flex items-center gap-1 mt-2">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <p className="text-xs text-red-600">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Reintentar
            </button>
          )}
          {(status === 'uploading' || status === 'idle') && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs font-medium text-gray-500 hover:text-red-600"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente para mostrar múltiples uploads
export interface UploadItem {
  id: string
  fileName: string
  fileSize: number
  status: UploadStatus
  progress: number
  errorMessage?: string
}

export interface UploadProgressListProps {
  uploads: UploadItem[]
  onRetry?: (id: string) => void
  onCancel?: (id: string) => void
}

export function UploadProgressList({ uploads, onRetry, onCancel }: UploadProgressListProps) {
  if (uploads.length === 0) return null

  const completedCount = uploads.filter((u) => u.status === 'completed').length
  const errorCount = uploads.filter((u) => u.status === 'error').length
  const inProgressCount = uploads.filter(
    (u) => u.status === 'uploading' || u.status === 'processing'
  ).length

  return (
    <div className="space-y-3">
      {/* Resumen */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          Progreso de carga ({uploads.length} archivo{uploads.length > 1 ? 's' : ''})
        </span>
        <div className="flex items-center gap-4 text-xs">
          {inProgressCount > 0 && (
            <span className="text-blue-600">
              {inProgressCount} en progreso
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-green-600">
              {completedCount} completado{completedCount > 1 ? 's' : ''}
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-red-600">
              {errorCount} error{errorCount > 1 ? 'es' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Lista de uploads */}
      <div className="space-y-2">
        {uploads.map((upload) => (
          <UploadProgress
            key={upload.id}
            fileName={upload.fileName}
            fileSize={upload.fileSize}
            status={upload.status}
            progress={upload.progress}
            errorMessage={upload.errorMessage}
            onRetry={onRetry ? () => onRetry(upload.id) : undefined}
            onCancel={onCancel ? () => onCancel(upload.id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

export default UploadProgress

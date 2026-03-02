import { Loader2, CheckCircle, XCircle, Search } from 'lucide-react'

export interface SearchProgressProps {
  status: 'idle' | 'searching' | 'completed' | 'error'
  progress: number // 0-100
  currentCode?: string
  processedCount: number
  totalCount: number
  errorMessage?: string
}

export function SearchProgress({
  status,
  progress,
  currentCode,
  processedCount,
  totalCount,
  errorMessage,
}: SearchProgressProps) {
  if (status === 'idle') {
    return null
  }

  const statusConfig = {
    searching: {
      icon: <Loader2 className="h-5 w-5 animate-spin text-blue-600" />,
      bgColor: 'bg-blue-50',
      barColor: 'bg-blue-600',
      textColor: 'text-blue-700',
      title: 'Buscando códigos...',
    },
    completed: {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      bgColor: 'bg-green-50',
      barColor: 'bg-green-600',
      textColor: 'text-green-700',
      title: '¡Búsqueda completada!',
    },
    error: {
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      bgColor: 'bg-red-50',
      barColor: 'bg-red-600',
      textColor: 'text-red-700',
      title: 'Error en la búsqueda',
    },
    idle: {
      icon: <Search className="h-5 w-5 text-gray-400" />,
      bgColor: 'bg-gray-50',
      barColor: 'bg-gray-400',
      textColor: 'text-gray-600',
      title: 'Esperando...',
    },
  }

  const config = statusConfig[status]

  return (
    <div className={`${config.bgColor} rounded-xl p-4 border border-gray-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className={`font-medium ${config.textColor}`}>{config.title}</span>
        </div>
        <span className={`text-sm ${config.textColor}`}>
          {processedCount.toLocaleString()} / {totalCount.toLocaleString()}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${config.barColor} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {status === 'searching' && currentCode && (
            <>
              Procesando: <code className="font-mono text-gray-700">{currentCode}</code>
            </>
          )}
          {status === 'completed' && 'Todos los códigos procesados'}
          {status === 'error' && (errorMessage || 'Ha ocurrido un error')}
        </span>
        <span className={`font-medium ${config.textColor}`}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}

export default SearchProgress

import { type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, XCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react'

type ErrorType = 'error' | 'warning' | 'not-found' | 'network' | 'permission'

interface ErrorMessageProps {
  type?: ErrorType
  title?: string
  message: string
  details?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const errorConfig: Record<ErrorType, { icon: typeof AlertCircle; colors: string }> = {
  error: {
    icon: XCircle,
    colors: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  warning: {
    icon: AlertTriangle,
    colors: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  'not-found': {
    icon: AlertCircle,
    colors: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
  network: {
    icon: AlertCircle,
    colors: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
  permission: {
    icon: AlertCircle,
    colors: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
}

export function ErrorMessage({
  type = 'error',
  title,
  message,
  details,
  action,
  secondaryAction,
  className = '',
}: ErrorMessageProps) {
  const config = errorConfig[type]
  const Icon = config.icon

  return (
    <div className={`p-4 rounded-lg border ${config.colors} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold mb-1">{title}</h4>
          )}
          <p className="text-sm opacity-90">{message}</p>
          {details && (
            <p className="text-xs opacity-70 mt-2 font-mono bg-black/5 dark:bg-white/5 p-2 rounded">
              {details}
            </p>
          )}
          {(action || secondaryAction) && (
            <div className="flex items-center gap-2 mt-3">
              {action && (
                <button
                  onClick={action.onClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-current/10 hover:bg-current/20 rounded-lg transition-colors"
                >
                  {action.label}
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="text-sm opacity-70 hover:opacity-100 underline transition-opacity"
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Error de página completa
interface FullPageErrorProps {
  code?: string | number
  title: string
  message: string
  showRetry?: boolean
  showHome?: boolean
  showBack?: boolean
  onRetry?: () => void
  onHome?: () => void
  onBack?: () => void
}

export function FullPageError({
  code,
  title,
  message,
  showRetry = true,
  showHome = true,
  showBack = false,
  onRetry,
  onHome,
  onBack,
}: FullPageErrorProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {code && (
          <div className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">
            {code}
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex items-center justify-center gap-3">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          )}
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          )}
          {showHome && onHome && (
            <button
              onClick={onHome}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              Inicio
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Empty state
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, message, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      {message && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
          {message}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

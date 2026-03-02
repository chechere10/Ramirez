import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ToastContext = createContext<ToastContextType | null>(null)

const DEFAULT_DURATION = 4000

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<ToastType, { bg: string; icon: string; border: string; progress: string; titleColor: string; messageColor: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-500',
    border: 'border-green-200 dark:border-green-700/50',
    progress: 'bg-green-500',
    titleColor: 'text-green-800 dark:text-green-200',
    messageColor: 'text-green-600 dark:text-green-300',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-500',
    border: 'border-red-200 dark:border-red-700/50',
    progress: 'bg-red-500',
    titleColor: 'text-red-800 dark:text-red-200',
    messageColor: 'text-red-600 dark:text-red-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-500',
    border: 'border-amber-200 dark:border-amber-700/50',
    progress: 'bg-amber-500',
    titleColor: 'text-amber-800 dark:text-amber-200',
    messageColor: 'text-amber-600 dark:text-amber-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-500',
    border: 'border-blue-200 dark:border-blue-700/50',
    progress: 'bg-blue-500',
    titleColor: 'text-blue-800 dark:text-blue-200',
    messageColor: 'text-blue-600 dark:text-blue-300',
  },
}

const confirmStyles = {
  danger: {
    icon: XCircle,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = icons[toast.type]
  const style = styles[toast.type]
  const duration = toast.duration || DEFAULT_DURATION

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3 p-4 rounded-xl border shadow-xl
        ${style.bg} ${style.border}
        backdrop-blur-sm
        transform transition-all duration-300 ease-out
      `}
      style={{
        animation: 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      role="alert"
    >
      <div className={`flex-shrink-0 p-1 rounded-full ${style.bg}`}>
        <Icon className={`h-5 w-5 ${style.icon}`} />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className={`font-semibold text-sm ${style.titleColor}`}>{toast.title}</p>
        {toast.message && (
          <p className={`mt-1 text-sm ${style.messageColor}`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${style.icon}`}
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
      
      {/* Barra de progreso animada */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
        <div
          className={`h-full ${style.progress} rounded-full origin-left`}
          style={{
            animation: `toastProgress ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  )
}

function ConfirmModal({ 
  options, 
  onConfirm, 
  onCancel 
}: { 
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void 
}) {
  const type = options.type || 'danger'
  const config = confirmStyles[type]
  const Icon = config.icon

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ animation: 'modalFadeIn 0.2s ease-out' }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ animation: 'modalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 p-3 rounded-full ${config.iconBg}`}>
              <Icon className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {options.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                {options.message}
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {options.cancelText || 'Cancelar'}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.buttonBg}`}
          >
            {options.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])

    // Auto-remove después de la duración
    const duration = toast.duration ?? DEFAULT_DURATION
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 6000 })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message, duration: 5000 })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message })
  }, [addToast])

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve })
    })
  }, [])

  const handleConfirm = () => {
    confirmState?.resolve(true)
    setConfirmState(null)
  }

  const handleCancel = () => {
    confirmState?.resolve(false)
    setConfirmState(null)
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, confirm }}>
      {children}
      
      {/* Toast Container - Esquina superior derecha */}
      <div
        className="fixed top-4 right-4 z-[150] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
        aria-live="polite"
        aria-label="Notificaciones"
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>

      {/* Modal de Confirmación */}
      {confirmState && (
        <ConfirmModal
          options={confirmState.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* Estilos de animación CSS */}
      <style>{`
        @keyframes toastSlideIn {
          0% {
            transform: translateX(120%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes toastProgress {
          0% {
            transform: scaleX(1);
          }
          100% {
            transform: scaleX(0);
          }
        }
        
        @keyframes modalFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        
        @keyframes modalScaleIn {
          0% {
            transform: scale(0.9) translateY(10px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

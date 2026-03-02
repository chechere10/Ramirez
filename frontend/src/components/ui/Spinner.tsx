import { Loader2 } from 'lucide-react'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type SpinnerVariant = 'primary' | 'secondary' | 'white'

interface SpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
  label?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

const variantClasses: Record<SpinnerVariant, string> = {
  primary: 'text-blue-600 dark:text-blue-400',
  secondary: 'text-gray-400 dark:text-gray-500',
  white: 'text-white',
}

export function Spinner({ size = 'md', variant = 'primary', className = '', label }: SpinnerProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="status">
      <Loader2 className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`} />
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
      <span className="sr-only">{label || 'Cargando...'}</span>
    </div>
  )
}

// Spinner de página completa
interface FullPageSpinnerProps {
  message?: string
}

export function FullPageSpinner({ message = 'Cargando...' }: FullPageSpinnerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" variant="primary" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">{message}</p>
      </div>
    </div>
  )
}

// Spinner dentro de un contenedor
interface ContainerSpinnerProps {
  message?: string
  size?: SpinnerSize
}

export function ContainerSpinner({ message, size = 'lg' }: ContainerSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Spinner size={size} variant="primary" />
      {message && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      )}
    </div>
  )
}

// Spinner inline para botones
interface ButtonSpinnerProps {
  className?: string
}

export function ButtonSpinner({ className = '' }: ButtonSpinnerProps) {
  return (
    <Loader2 className={`animate-spin h-4 w-4 ${className}`} />
  )
}

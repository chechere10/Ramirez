import { Play, Loader2, Search } from 'lucide-react'

export interface SearchButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  codesCount: number
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

export function SearchButton({
  onClick,
  disabled = false,
  loading = false,
  codesCount,
  variant = 'primary',
  size = 'lg',
}: SearchButtonProps) {
  const isDisabled = disabled || loading || codesCount === 0

  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 shadow-sm'
  
  const variantClasses = {
    primary: isDisabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: isDisabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
      : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 active:bg-blue-100',
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-6 py-4 text-base w-full',
  }

  const handleClick = () => {
    if (!isDisabled) {
      onClick()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Buscando {codesCount} código{codesCount !== 1 ? 's' : ''}...</span>
        </>
      ) : codesCount === 0 ? (
        <>
          <Search className="h-5 w-5" />
          <span>Ingresa códigos para buscar</span>
        </>
      ) : (
        <>
          <Play className="h-5 w-5" />
          <span>Ejecutar Búsqueda ({codesCount.toLocaleString()} código{codesCount !== 1 ? 's' : ''})</span>
        </>
      )}
    </button>
  )
}

export default SearchButton

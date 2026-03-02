import { useState, useCallback, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Plus, X, Hash } from 'lucide-react'

export interface CodeInputProps {
  onAddCode: (code: string) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  autoNormalize?: boolean
}

export function CodeInput({
  onAddCode,
  placeholder = 'Ingresa un código...',
  disabled = false,
  maxLength = 50,
  autoNormalize = true,
}: CodeInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const normalizeCode = useCallback((code: string): string => {
    if (!autoNormalize) return code.trim()
    
    // Normalizar: mayúsculas, sin espacios extras, sin guiones
    return code
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '')
      .replace(/[^A-Z0-9]/g, '')
  }, [autoNormalize])

  const validateCode = useCallback((code: string): string | null => {
    if (!code) return 'Ingresa un código'
    if (code.length < 2) return 'Código muy corto (mínimo 2 caracteres)'
    if (code.length > maxLength) return `Código muy largo (máximo ${maxLength} caracteres)`
    return null
  }, [maxLength])

  const handleSubmit = useCallback(() => {
    const normalizedCode = normalizeCode(value)
    const validationError = validateCode(normalizedCode)

    if (validationError) {
      setError(validationError)
      return
    }

    onAddCode(normalizedCode)
    setValue('')
    setError(null)
    inputRef.current?.focus()
  }, [value, normalizeCode, validateCode, onAddCode])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
      // Limpiar error al escribir
      if (error) setError(null)
    },
    [handleSubmit, error]
  )

  const handleClear = useCallback(() => {
    setValue('')
    setError(null)
    inputRef.current?.focus()
  }, [])

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Agregar código individual
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Hash className="h-4 w-4 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength + 10} // Permitir algo extra para normalización
            className={`
              block w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}
            `}
            aria-label="Ingrese un código"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Limpiar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {autoNormalize && value && normalizeCode(value) !== value.trim() && (
        <p className="text-xs text-gray-500">
          Se normalizará a: <span className="font-mono font-medium">{normalizeCode(value)}</span>
        </p>
      )}
    </div>
  )
}

export default CodeInput

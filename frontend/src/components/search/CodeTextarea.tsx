import { useState, useCallback } from 'react'
import { FileText, AlertCircle, CheckCircle, Copy, Trash2 } from 'lucide-react'

export interface CodeTextareaProps {
  onCodesExtracted: (codes: string[]) => void
  placeholder?: string
  disabled?: boolean
  autoNormalize?: boolean
  maxCodes?: number
}

interface ParseResult {
  codes: string[]
  duplicates: number
  invalid: number
  total: number
}

export function CodeTextarea({
  onCodesExtracted,
  placeholder = 'Pega códigos aquí...\nUno por línea o separados por coma, punto y coma o tabulador',
  disabled = false,
  autoNormalize = true,
  maxCodes = 10000,
}: CodeTextareaProps) {
  const [value, setValue] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  const normalizeCode = useCallback(
    (code: string): string => {
      if (!autoNormalize) return code.trim()

      return code
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '')
        .replace(/[^A-Z0-9]/g, '')
    },
    [autoNormalize]
  )

  const parseText = useCallback(
    (text: string): ParseResult => {
      // Separar por líneas, comas, punto y coma, o tabuladores
      const rawCodes = text
        .split(/[\n,;\t]+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0)

      const validCodes: string[] = []
      const seenCodes = new Set<string>()
      let duplicates = 0
      let invalid = 0

      for (const raw of rawCodes) {
        const normalized = normalizeCode(raw)

        // Validar longitud mínima
        if (normalized.length < 2) {
          invalid++
          continue
        }

        // Verificar duplicados
        if (seenCodes.has(normalized)) {
          duplicates++
          continue
        }

        seenCodes.add(normalized)
        validCodes.push(normalized)

        // Verificar límite
        if (validCodes.length >= maxCodes) break
      }

      return {
        codes: validCodes,
        duplicates,
        invalid,
        total: rawCodes.length,
      }
    },
    [normalizeCode, maxCodes]
  )

  const handleChange = useCallback(
    (text: string) => {
      setValue(text)
      if (text.trim()) {
        const result = parseText(text)
        setParseResult(result)
      } else {
        setParseResult(null)
      }
    },
    [parseText]
  )

  const handleExtract = useCallback(() => {
    if (!parseResult || parseResult.codes.length === 0) return
    onCodesExtracted(parseResult.codes)
    setValue('')
    setParseResult(null)
  }, [parseResult, onCodesExtracted])

  const handleClear = useCallback(() => {
    setValue('')
    setParseResult(null)
  }, [])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      handleChange(text)
    } catch {
      // Clipboard API no disponible o sin permisos
      console.log('No se pudo acceder al portapapeles')
    }
  }, [handleChange])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Pegar múltiples códigos
        </label>
        <button
          type="button"
          onClick={handlePaste}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        >
          <Copy className="h-3 w-3" />
          Pegar desde portapapeles
        </button>
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={6}
          className={`
            block w-full px-4 py-3 text-sm font-mono border rounded-lg resize-y
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${parseResult && parseResult.codes.length > 0 ? 'border-green-300 bg-green-50/50' : 'border-gray-300'}
          `}
          aria-label="Área para pegar múltiples códigos"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
            aria-label="Limpiar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Resultado del parseo */}
      {parseResult && (
        <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Total: {parseResult.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-600 font-medium">
                Válidos: {parseResult.codes.length}
              </span>
            </div>
            {parseResult.duplicates > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-600">Duplicados: {parseResult.duplicates}</span>
              </div>
            )}
            {parseResult.invalid > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-600">Inválidos: {parseResult.invalid}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExtract}
            disabled={disabled || parseResult.codes.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            Agregar {parseResult.codes.length} código{parseResult.codes.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Separadores soportados: nueva línea, coma, punto y coma, tabulador
      </p>
    </div>
  )
}

export default CodeTextarea

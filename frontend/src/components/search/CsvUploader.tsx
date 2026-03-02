import { useCallback, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react'

export interface CsvUploaderProps {
  onCodesLoaded: (codes: string[]) => void
  disabled?: boolean
  autoNormalize?: boolean
  maxCodes?: number
}

interface ParseResult {
  codes: string[]
  duplicates: number
  invalid: number
  total: number
  fileName: string
}

export function CsvUploader({
  onCodesLoaded,
  disabled = false,
  autoNormalize = true,
  maxCodes = 10000,
}: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const parseCSV = useCallback(
    (content: string, fileName: string): ParseResult => {
      // Detectar separador (coma, punto y coma, tabulador)
      const firstLine = content.split('\n')[0]
      let separator = ','
      if (firstLine.includes('\t')) separator = '\t'
      else if (firstLine.includes(';')) separator = ';'

      const lines = content.split('\n').filter((line) => line.trim())
      const validCodes: string[] = []
      const seenCodes = new Set<string>()
      let duplicates = 0
      let invalid = 0
      let totalRaw = 0

      for (const line of lines) {
        // Obtener valores de cada celda
        const cells = line.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ''))

        for (const cell of cells) {
          if (!cell) continue
          totalRaw++

          const normalized = normalizeCode(cell)

          // Validar longitud
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

          if (validCodes.length >= maxCodes) break
        }

        if (validCodes.length >= maxCodes) break
      }

      return {
        codes: validCodes,
        duplicates,
        invalid,
        total: totalRaw,
        fileName,
      }
    },
    [normalizeCode, maxCodes]
  )

  const processFile = useCallback(
    async (file: File) => {
      setError(null)
      setParseResult(null)

      // Validar tipo de archivo
      const validTypes = ['text/csv', 'text/plain', 'application/csv']
      const isCSV = validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.txt')

      if (!isCSV) {
        setError('Solo se permiten archivos CSV o TXT')
        return
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo es muy grande (máximo 5MB)')
        return
      }

      try {
        const content = await file.text()
        const result = parseCSV(content, file.name)

        if (result.codes.length === 0) {
          setError('No se encontraron códigos válidos en el archivo')
          return
        }

        setParseResult(result)
      } catch {
        setError('Error al leer el archivo')
      }
    },
    [parseCSV]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [disabled, processFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      e.target.value = ''
    },
    [processFile]
  )

  const handleConfirm = useCallback(() => {
    if (!parseResult) return
    onCodesLoaded(parseResult.codes)
    setParseResult(null)
  }, [parseResult, onCodesLoaded])

  const handleCancel = useCallback(() => {
    setParseResult(null)
    setError(null)
  }, [])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Cargar códigos desde archivo CSV
      </label>

      {!parseResult ? (
        <>
          {/* Dropzone */}
          <div
            onDragEnter={(e) => {
              e.preventDefault()
              if (!disabled) setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setIsDragging(false)
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
              ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-blue-400 hover:bg-blue-50/50'}
              ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300'}
              ${error ? 'border-red-300 bg-red-50' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileInput}
              disabled={disabled}
              className="hidden"
              aria-label="Seleccionar archivo CSV"
            />

            <div className="flex flex-col items-center gap-2">
              <div className={`p-3 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <FileSpreadsheet
                  className={`h-8 w-8 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isDragging ? (
                    'Suelta el archivo aquí'
                  ) : (
                    <>
                      Arrastra un CSV o{' '}
                      <span className="text-blue-600">haz clic para seleccionar</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  CSV o TXT hasta 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Resultado del parseo */
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-700">
                  Archivo procesado: {parseResult.fileName}
                </p>
                <p className="text-xs text-green-600">
                  {parseResult.codes.length} código{parseResult.codes.length !== 1 ? 's' : ''} válido
                  {parseResult.codes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-white rounded border border-green-100">
              <p className="text-gray-500">Total leídos</p>
              <p className="font-semibold text-gray-900">{parseResult.total}</p>
            </div>
            <div className="p-2 bg-white rounded border border-green-100">
              <p className="text-gray-500">Duplicados</p>
              <p className="font-semibold text-yellow-600">{parseResult.duplicates}</p>
            </div>
            <div className="p-2 bg-white rounded border border-green-100">
              <p className="text-gray-500">Inválidos</p>
              <p className="font-semibold text-red-600">{parseResult.invalid}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Upload className="h-4 w-4" />
              Agregar {parseResult.codes.length} códigos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CsvUploader

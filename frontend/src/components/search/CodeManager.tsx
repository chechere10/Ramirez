import { useState, useCallback } from 'react'
import { Hash, Keyboard, FileSpreadsheet, List, ChevronDown, ChevronUp } from 'lucide-react'
import { CodeInput } from './CodeInput'
import { CodeTextarea } from './CodeTextarea'
import { CsvUploader } from './CsvUploader'
import { CodeList } from './CodeList'

export interface CodeManagerProps {
  codes: string[]
  onCodesChange: (codes: string[]) => void
  readOnly?: boolean
  autoNormalize?: boolean
  maxCodes?: number
}

type InputMethod = 'single' | 'multiple' | 'csv'

export function CodeManager({
  codes,
  onCodesChange,
  readOnly = false,
  autoNormalize = true,
  maxCodes = 10000,
}: CodeManagerProps) {
  const [activeMethod, setActiveMethod] = useState<InputMethod>('multiple')
  const [isInputExpanded, setIsInputExpanded] = useState(true)

  const handleAddCode = useCallback(
    (code: string) => {
      if (codes.includes(code)) {
        // Ya existe, no agregar duplicado
        return
      }
      if (codes.length >= maxCodes) {
        alert(`Límite de ${maxCodes} códigos alcanzado`)
        return
      }
      onCodesChange([...codes, code])
    },
    [codes, onCodesChange, maxCodes]
  )

  const handleAddCodes = useCallback(
    (newCodes: string[]) => {
      const existingSet = new Set(codes)
      const toAdd = newCodes.filter((c) => !existingSet.has(c))
      const remaining = maxCodes - codes.length
      const finalCodes = toAdd.slice(0, remaining)

      if (finalCodes.length < toAdd.length) {
        alert(`Se agregaron ${finalCodes.length} de ${toAdd.length} códigos (límite de ${maxCodes})`)
      }

      onCodesChange([...codes, ...finalCodes])
    },
    [codes, onCodesChange, maxCodes]
  )

  const handleRemoveCode = useCallback(
    (code: string) => {
      onCodesChange(codes.filter((c) => c !== code))
    },
    [codes, onCodesChange]
  )

  const handleRemoveAll = useCallback(() => {
    onCodesChange([])
  }, [onCodesChange])

  const handleUpdateCode = useCallback(
    (oldCode: string, newCode: string) => {
      if (codes.includes(newCode) && oldCode !== newCode) {
        alert('Este código ya existe en la lista')
        return
      }
      onCodesChange(codes.map((c) => (c === oldCode ? newCode : c)))
    },
    [codes, onCodesChange]
  )

  const inputMethods = [
    { id: 'single' as const, label: 'Individual', icon: Keyboard },
    { id: 'multiple' as const, label: 'Múltiples', icon: List },
    { id: 'csv' as const, label: 'Archivo CSV', icon: FileSpreadsheet },
  ]

  return (
    <div className="space-y-4">
      {/* Header con contador */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Códigos a buscar</h3>
          <span className="px-2 py-0.5 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
            {codes.length}
          </span>
        </div>
        {!readOnly && (
          <button
            onClick={() => setIsInputExpanded(!isInputExpanded)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            {isInputExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar entrada
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Mostrar entrada
              </>
            )}
          </button>
        )}
      </div>

      {/* Sección de entrada (colapsable) */}
      {!readOnly && isInputExpanded && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {/* Selector de método */}
          <div className="flex border-b border-gray-200 -mx-4 px-4">
            {inputMethods.map((method) => {
              const Icon = method.icon
              const isActive = activeMethod === method.id
              return (
                <button
                  key={method.id}
                  onClick={() => setActiveMethod(method.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors
                    ${
                      isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {method.label}
                </button>
              )
            })}
          </div>

          {/* Contenido según método activo */}
          <div className="pt-2">
            {activeMethod === 'single' && (
              <CodeInput
                onAddCode={handleAddCode}
                autoNormalize={autoNormalize}
                disabled={codes.length >= maxCodes}
              />
            )}

            {activeMethod === 'multiple' && (
              <CodeTextarea
                onCodesExtracted={handleAddCodes}
                autoNormalize={autoNormalize}
                maxCodes={maxCodes - codes.length}
                disabled={codes.length >= maxCodes}
              />
            )}

            {activeMethod === 'csv' && (
              <CsvUploader
                onCodesLoaded={handleAddCodes}
                autoNormalize={autoNormalize}
                maxCodes={maxCodes - codes.length}
                disabled={codes.length >= maxCodes}
              />
            )}
          </div>

          {/* Info de límite */}
          {codes.length > 0 && (
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              {codes.length.toLocaleString()} de {maxCodes.toLocaleString()} códigos máximos
            </p>
          )}
        </div>
      )}

      {/* Lista de códigos */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <CodeList
          codes={codes}
          onRemoveCode={handleRemoveCode}
          onRemoveAll={handleRemoveAll}
          onUpdateCode={handleUpdateCode}
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}

export default CodeManager

import { Info } from 'lucide-react'
import type { NormalizationSettings } from '../../hooks/usePreferences'

interface NormalizationConfigProps {
  value: NormalizationSettings
  onChange: (settings: Partial<NormalizationSettings>) => void
  showPreview?: boolean
}

export function NormalizationConfig({ value, onChange, showPreview = true }: NormalizationConfigProps) {
  // Ejemplo de código para mostrar el efecto de la normalización
  const sampleCode = '  abc-00123-xyz  '

  // Aplicar normalización al ejemplo
  function normalizeExample(code: string): string {
    let result = code
    if (value.trimWhitespace) result = result.trim()
    if (value.removeSpaces) result = result.replace(/\s+/g, '')
    if (value.removeHyphens) result = result.replace(/-/g, '')
    if (value.removeLeadingZeros) result = result.replace(/^0+/, '')
    if (value.toUpperCase) result = result.toUpperCase()
    return result
  }

  const options = [
    {
      key: 'trimWhitespace' as const,
      label: 'Eliminar espacios al inicio y final',
      description: 'Remueve espacios en blanco antes y después del código',
    },
    {
      key: 'removeSpaces' as const,
      label: 'Eliminar espacios internos',
      description: 'Remueve todos los espacios dentro del código',
    },
    {
      key: 'removeHyphens' as const,
      label: 'Eliminar guiones',
      description: 'Remueve todos los guiones (-) del código',
    },
    {
      key: 'removeLeadingZeros' as const,
      label: 'Eliminar ceros a la izquierda',
      description: 'Remueve los ceros iniciales (001 → 1)',
    },
    {
      key: 'toUpperCase' as const,
      label: 'Convertir a mayúsculas',
      description: 'Convierte todas las letras a mayúsculas',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Normalización de códigos
        </label>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            La normalización permite comparar códigos con diferentes formatos. 
            Por ejemplo, "ABC-123" y "abc 123" pueden coincidir si se eliminan guiones y espacios.
          </div>
        </div>
      </div>

      {/* Opciones */}
      <div className="space-y-3">
        {options.map(option => (
          <label
            key={option.key}
            className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
          >
            <input
              type="checkbox"
              checked={value[option.key]}
              onChange={e => onChange({ [option.key]: e.target.checked })}
              className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {option.description}
              </span>
            </div>
          </label>
        ))}
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Vista previa:</div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">Original</div>
              <code className="block px-3 py-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm font-mono">
                "{sampleCode}"
              </code>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">Normalizado</div>
              <code className="block px-3 py-2 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-800 text-sm font-mono text-green-700 dark:text-green-300">
                "{normalizeExample(sampleCode)}"
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

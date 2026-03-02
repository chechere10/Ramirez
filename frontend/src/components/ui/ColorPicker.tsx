import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { HIGHLIGHT_COLORS } from '../../hooks/usePreferences'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  showOpacity?: boolean
  opacity?: number
  onOpacityChange?: (opacity: number) => void
}

export function ColorPicker({
  value,
  onChange,
  label = 'Color de resaltado',
  showOpacity = false,
  opacity = 50,
  onOpacityChange,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedColor = HIGHLIGHT_COLORS.find(c => c.value === value)

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {/* Color Selector */}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-md border border-gray-300 dark:border-gray-600 shadow-inner"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {selectedColor?.name || 'Personalizado'}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
            {/* Colores predefinidos */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => {
                    onChange(color.value)
                    setIsOpen(false)
                  }}
                  className={`
                    relative w-full aspect-square rounded-lg border-2 transition-all
                    ${value === color.value
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }
                  `}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {value === color.value && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>

            {/* Color personalizado */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Color personalizado
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  placeholder="#FFEB3B"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    onChange(customColor)
                    setIsOpen(false)
                  }}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opacity Slider */}
      {showOpacity && onOpacityChange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600 dark:text-gray-400">Opacidad</label>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{opacity}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={opacity}
            onChange={e => onOpacityChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          
          {/* Preview */}
          <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Vista previa:</span>
            <div className="flex-1 h-6 rounded relative overflow-hidden">
              <div className="absolute inset-0 bg-white dark:bg-gray-800" />
              <div
                className="absolute inset-0 rounded"
                style={{
                  backgroundColor: value,
                  opacity: opacity / 100,
                }}
              />
              <span className="relative z-10 px-2 text-sm font-mono">ABC-12345</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

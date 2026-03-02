import { useState } from 'react'
import { FileText, FileSpreadsheet, Check, Settings2 } from 'lucide-react'
import type { ExportFormat } from './ExportButton'

export interface ExportOptionsData {
  format: ExportFormat
  includeStats: boolean
  includeNotFound: boolean
  includePartial: boolean
  highlightColor: string
  addWatermark: boolean
  addSummaryPage: boolean
}

export interface ExportOptionsProps {
  value: ExportOptionsData
  onChange: (options: ExportOptionsData) => void
  disabled?: boolean
}

const HIGHLIGHT_COLORS = [
  { value: '#FFEB3B', label: 'Amarillo', class: 'bg-yellow-400' },
  { value: '#4CAF50', label: 'Verde', class: 'bg-green-500' },
  { value: '#2196F3', label: 'Azul', class: 'bg-blue-500' },
  { value: '#FF9800', label: 'Naranja', class: 'bg-orange-500' },
  { value: '#E91E63', label: 'Rosa', class: 'bg-pink-500' },
]

export function ExportOptions({ value, onChange, disabled = false }: ExportOptionsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateOption = <K extends keyof ExportOptionsData>(
    key: K,
    newValue: ExportOptionsData[K]
  ) => {
    onChange({ ...value, [key]: newValue })
  }

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Format selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Formato de exportación
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateOption('format', 'pdf')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              value.format === 'pdf'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className={`p-2 rounded-lg ${value.format === 'pdf' ? 'bg-red-100' : 'bg-gray-100'}`}>
              <FileText className={`h-5 w-5 ${value.format === 'pdf' ? 'text-red-600' : 'text-gray-500'}`} />
            </div>
            <div className="text-left">
              <p className={`font-medium ${value.format === 'pdf' ? 'text-red-700' : 'text-gray-700'}`}>
                PDF
              </p>
              <p className="text-xs text-gray-500">Con resaltados</p>
            </div>
            {value.format === 'pdf' && (
              <Check className="h-5 w-5 text-red-600 ml-auto" />
            )}
          </button>

          <button
            type="button"
            onClick={() => updateOption('format', 'csv')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              value.format === 'csv'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className={`p-2 rounded-lg ${value.format === 'csv' ? 'bg-green-100' : 'bg-gray-100'}`}>
              <FileSpreadsheet className={`h-5 w-5 ${value.format === 'csv' ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div className="text-left">
              <p className={`font-medium ${value.format === 'csv' ? 'text-green-700' : 'text-gray-700'}`}>
                CSV
              </p>
              <p className="text-xs text-gray-500">Datos tabulares</p>
            </div>
            {value.format === 'csv' && (
              <Check className="h-5 w-5 text-green-600 ml-auto" />
            )}
          </button>
        </div>
      </div>

      {/* Content options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contenido a incluir
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includeStats}
              onChange={(e) => updateOption('includeStats', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Incluir estadísticas</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includeNotFound}
              onChange={(e) => updateOption('includeNotFound', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Incluir códigos no encontrados</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includePartial}
              onChange={(e) => updateOption('includePartial', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Incluir coincidencias parciales</span>
          </label>
        </div>
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
      >
        <Settings2 className="h-4 w-4" />
        <span>{showAdvanced ? 'Ocultar' : 'Mostrar'} opciones avanzadas</span>
      </button>

      {/* Advanced options */}
      {showAdvanced && (
        <div className="space-y-4 pt-2 border-t border-gray-200">
          {/* PDF specific options */}
          {value.format === 'pdf' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de resaltado
                </label>
                <div className="flex gap-2">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => updateOption('highlightColor', color.value)}
                      className={`w-8 h-8 rounded-full ${color.class} transition-transform ${
                        value.highlightColor === color.value
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.addWatermark}
                  onChange={(e) => updateOption('addWatermark', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Agregar marca de agua "Procesado"</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.addSummaryPage}
                  onChange={(e) => updateOption('addSummaryPage', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Agregar página de resumen al inicio</span>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptionsData = {
  format: 'pdf',
  includeStats: true,
  includeNotFound: true,
  includePartial: true,
  highlightColor: '#FFEB3B',
  addWatermark: true,
  addSummaryPage: true,
}

export default ExportOptions

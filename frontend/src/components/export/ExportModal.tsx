import { useState, useCallback } from 'react'
import { X, Download, Loader2 } from 'lucide-react'
import { ExportOptions, DEFAULT_EXPORT_OPTIONS } from './ExportOptions'
import { ExportPreview } from './ExportPreview'
import type { ExportOptionsData } from './ExportOptions'
import type { ExportPreviewData } from './ExportPreview'

export interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (options: ExportOptionsData) => Promise<void>
  previewData: ExportPreviewData
}

export function ExportModal({
  isOpen,
  onClose,
  onExport,
  previewData,
}: ExportModalProps) {
  const [options, setOptions] = useState<ExportOptionsData>(DEFAULT_EXPORT_OPTIONS)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError(null)

    try {
      await onExport(options)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }, [options, onExport, onClose])

  const handleClose = useCallback(() => {
    if (!exporting) {
      onClose()
    }
  }, [exporting, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Exportar Resultados</h2>
              <p className="text-sm text-gray-500">Configura las opciones de exportación</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={exporting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Options */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Opciones</h3>
                <ExportOptions
                  value={options}
                  onChange={setOptions}
                  disabled={exporting}
                />
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Vista previa</h3>
                <ExportPreview
                  data={previewData}
                  options={options}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <p className="text-sm text-gray-500">
              Formato: <span className="font-medium uppercase">{options.format}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
                  options.format === 'pdf'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Exportar {options.format.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportModal

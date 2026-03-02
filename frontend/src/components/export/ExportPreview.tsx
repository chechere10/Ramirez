import { FileText, CheckCircle, XCircle, AlertCircle, BarChart3 } from 'lucide-react'
import type { ExportOptionsData } from './ExportOptions'

export interface ExportPreviewData {
  documentName: string
  totalCodes: number
  foundCodes: number
  notFoundCodes: number
  partialCodes: number
  searchDate: string
}

export interface ExportPreviewProps {
  data: ExportPreviewData
  options: ExportOptionsData
}

export function ExportPreview({ data, options }: ExportPreviewProps) {
  const coveragePercent = data.totalCodes > 0 
    ? Math.round((data.foundCodes / data.totalCodes) * 100) 
    : 0

  const getEstimatedRows = () => {
    let rows = data.foundCodes
    if (options.includeNotFound) rows += data.notFoundCodes
    if (options.includePartial) rows += data.partialCodes
    return rows
  }

  return (
    <div className="space-y-4">
      {/* Preview header */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <FileText className="h-6 w-6 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{data.documentName}</p>
          <p className="text-xs text-gray-500">
            Búsqueda del {data.searchDate}
          </p>
        </div>
      </div>

      {/* Preview content based on format */}
      {options.format === 'pdf' ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* PDF Preview mockup */}
          <div className="bg-gray-800 text-white text-xs px-3 py-1.5 flex items-center justify-between">
            <span>Vista previa del PDF</span>
            <span className="text-gray-400">.pdf</span>
          </div>
          
          <div className="p-4 bg-white space-y-3">
            {/* Summary page preview */}
            {options.addSummaryPage && (
              <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 mb-2">📄 Página de Resumen</p>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>• Documento: {data.documentName}</p>
                  <p>• Total códigos: {data.totalCodes}</p>
                  <p>• Cobertura: {coveragePercent}%</p>
                </div>
              </div>
            )}

            {/* Highlights preview */}
            <div className="border border-dashed border-gray-300 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">📑 Páginas con resaltados</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: options.highlightColor }}
                />
                <span className="text-xs text-gray-500">
                  {data.foundCodes} códigos resaltados en el documento
                </span>
              </div>
            </div>

            {/* Watermark indicator */}
            {options.addWatermark && (
              <p className="text-xs text-gray-400 text-center italic">
                + Marca de agua "Procesado" en cada página
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* CSV Preview mockup */}
          <div className="bg-green-800 text-white text-xs px-3 py-1.5 flex items-center justify-between">
            <span>Vista previa del CSV</span>
            <span className="text-green-300">.csv</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Código</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Página</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Frecuencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-green-50">
                  <td className="px-3 py-2 font-mono">ABC123456</td>
                  <td className="px-3 py-2 text-green-600">Encontrado</td>
                  <td className="px-3 py-2">5</td>
                  <td className="px-3 py-2">2</td>
                </tr>
                {options.includePartial && (
                  <tr className="bg-yellow-50">
                    <td className="px-3 py-2 font-mono">DEF789012</td>
                    <td className="px-3 py-2 text-yellow-600">Parcial</td>
                    <td className="px-3 py-2">12</td>
                    <td className="px-3 py-2">1</td>
                  </tr>
                )}
                {options.includeNotFound && (
                  <tr className="bg-red-50">
                    <td className="px-3 py-2 font-mono">GHI345678</td>
                    <td className="px-3 py-2 text-red-600">No encontrado</td>
                    <td className="px-3 py-2">-</td>
                    <td className="px-3 py-2">0</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-center text-gray-400">
                    ... {getEstimatedRows()} filas en total
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {options.includeStats && (
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Estadísticas incluidas</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white rounded-lg p-2">
              <p className="text-lg font-bold text-gray-900">{data.totalCodes}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {data.foundCodes}
              </p>
              <p className="text-xs text-gray-500">Encontrados</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-lg font-bold text-red-600 flex items-center justify-center gap-1">
                <XCircle className="h-4 w-4" />
                {data.notFoundCodes}
              </p>
              <p className="text-xs text-gray-500">No encontrados</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-lg font-bold text-yellow-600 flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {data.partialCodes}
              </p>
              <p className="text-xs text-gray-500">Parciales</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportPreview

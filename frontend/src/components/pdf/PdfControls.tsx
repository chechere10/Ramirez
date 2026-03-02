import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react'

export interface PdfControlsProps {
  currentPage: number
  totalPages: number
  scale: number
  onPageChange: (page: number) => void
  onScaleChange: (scale: number) => void
  onRotate?: () => void
  onDownload?: () => void
  onFullscreen?: () => void
  isFullscreen?: boolean
  minScale?: number
  maxScale?: number
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]

export function PdfControls({
  currentPage,
  totalPages,
  scale,
  onPageChange,
  onScaleChange,
  onRotate,
  onDownload,
  onFullscreen,
  isFullscreen = false,
  minScale = 0.5,
  maxScale = 3,
}: PdfControlsProps) {
  const canZoomIn = scale < maxScale
  const canZoomOut = scale > minScale
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  const handleZoomIn = () => {
    const nextZoom = ZOOM_LEVELS.find((z) => z > scale) ?? maxScale
    onScaleChange(Math.min(nextZoom, maxScale))
  }

  const handleZoomOut = () => {
    const prevZoom = [...ZOOM_LEVELS].reverse().find((z) => z < scale) ?? minScale
    onScaleChange(Math.max(prevZoom, minScale))
  }

  const handlePageInput = (value: string) => {
    const page = parseInt(value, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  return (
    <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2">
      {/* Page navigation */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          title="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 px-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => handlePageInput(e.target.value)}
            className="w-14 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-500">de {totalPages}</span>
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          title="Siguiente página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={!canZoomOut}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          title="Reducir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <select
          value={scale}
          onChange={(e) => onScaleChange(parseFloat(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {ZOOM_LEVELS.map((z) => (
            <option key={z} value={z}>
              {Math.round(z * 100)}%
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={!canZoomIn}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          title="Aumentar zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Extra actions */}
      <div className="flex items-center gap-1">
        {onRotate && (
          <button
            type="button"
            onClick={onRotate}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Rotar 90°"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        )}

        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Descargar PDF"
          >
            <Download className="h-4 w-4" />
          </button>
        )}

        {onFullscreen && (
          <button
            type="button"
            onClick={onFullscreen}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default PdfControls

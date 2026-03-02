import { useState, useCallback, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2, FileWarning, FileX } from 'lucide-react'
import { PdfControls } from './PdfControls'
import { PdfHighlight } from './PdfHighlight'
import type { Highlight } from './PdfHighlight'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export interface PdfViewerProps {
  /** URL or File object of the PDF to display */
  file: string | File | null
  /** Highlights to show on the PDF */
  highlights?: Highlight[]
  /** Currently selected highlight ID */
  selectedHighlightId?: string | null
  /** Initial page to display */
  initialPage?: number
  /** Initial zoom scale */
  initialScale?: number
  /** Callback when page changes */
  onPageChange?: (page: number) => void
  /** Callback when a highlight is clicked */
  onHighlightClick?: (highlight: Highlight) => void
  /** Callback to download the PDF */
  onDownload?: () => void
  /** Custom class name for the container */
  className?: string
}

export function PdfViewer({
  file,
  highlights = [],
  selectedHighlightId,
  initialPage = 1,
  initialScale = 1,
  onPageChange,
  onHighlightClick,
  onDownload,
  className = '',
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [scale, setScale] = useState<number>(initialScale)
  const [rotation, setRotation] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })

  const containerRef = useRef<HTMLDivElement>(null)

  // Navigate to page when selectedHighlightId changes
  useEffect(() => {
    if (selectedHighlightId) {
      const highlight = highlights.find((h) => h.id === selectedHighlightId)
      if (highlight && highlight.page !== currentPage) {
        setCurrentPage(highlight.page)
        onPageChange?.(highlight.page)
      }
    }
  }, [selectedHighlightId, highlights, currentPage, onPageChange])

  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }, [])

  const handleDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err)
    setError('Error al cargar el PDF. Verifica que el archivo sea válido.')
    setLoading(false)
  }, [])

  const handlePageLoadSuccess = useCallback((page: { width: number; height: number }) => {
    setPageSize({ width: page.width, height: page.height })
  }, [])

  const handlePageChange = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, numPages))
    setCurrentPage(validPage)
    onPageChange?.(validPage)
  }, [numPages, onPageChange])

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale)
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  // Go to specific page (called from external components)
  const goToPage = useCallback((page: number) => {
    handlePageChange(page)
  }, [handlePageChange])

  // Expose goToPage method
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { goToPage: (page: number) => void }).goToPage = goToPage
    }
  }, [goToPage])

  if (!file) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gray-50 ${className}`}>
        <FileX className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-center">
          No hay PDF seleccionado
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Selecciona un documento para visualizar
        </p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gray-100 ${className}`} ref={containerRef}>
      {/* Controls bar */}
      <PdfControls
        currentPage={currentPage}
        totalPages={numPages}
        scale={scale}
        onPageChange={handlePageChange}
        onScaleChange={handleScaleChange}
        onRotate={handleRotate}
        onDownload={onDownload}
      />

      {/* PDF Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <Document
            file={file}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">Cargando PDF...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center p-12">
                <FileWarning className="h-10 w-10 text-red-500 mb-4" />
                <p className="text-red-600 font-medium">Error al cargar el PDF</p>
                <p className="text-sm text-gray-500 mt-1">{error}</p>
              </div>
            }
          >
            {!loading && !error && (
              <div className="relative inline-block shadow-lg">
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  rotate={rotation}
                  onLoadSuccess={handlePageLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-8 bg-white">
                      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                    </div>
                  }
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />

                {/* Highlights overlay */}
                <PdfHighlight
                  highlights={highlights}
                  currentPage={currentPage}
                  scale={scale}
                  containerWidth={pageSize.width}
                  containerHeight={pageSize.height}
                  selectedHighlightId={selectedHighlightId}
                  onHighlightClick={onHighlightClick}
                />
              </div>
            )}
          </Document>
        </div>
      </div>

      {/* Page indicator (mobile) */}
      <div className="md:hidden bg-white border-t border-gray-200 px-4 py-2 text-center text-sm text-gray-600">
        Página {currentPage} de {numPages}
      </div>
    </div>
  )
}

export default PdfViewer

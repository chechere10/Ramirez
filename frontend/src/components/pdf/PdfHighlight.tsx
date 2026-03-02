import { useMemo } from 'react'

export interface Highlight {
  id: string
  page: number
  x: number      // percentage 0-100
  y: number      // percentage 0-100
  width: number  // percentage 0-100
  height: number // percentage 0-100
  color?: string
  label?: string
}

export interface PdfHighlightProps {
  highlights: Highlight[]
  currentPage: number
  scale: number
  containerWidth: number
  containerHeight: number
  selectedHighlightId?: string | null
  onHighlightClick?: (highlight: Highlight) => void
}

export function PdfHighlight({
  highlights,
  currentPage,
  scale,
  containerWidth,
  containerHeight,
  selectedHighlightId,
  onHighlightClick,
}: PdfHighlightProps) {
  // Filter highlights for current page
  const pageHighlights = useMemo(() => {
    return highlights.filter((h) => h.page === currentPage)
  }, [highlights, currentPage])

  if (pageHighlights.length === 0) {
    return null
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        width: containerWidth * scale,
        height: containerHeight * scale,
      }}
    >
      {pageHighlights.map((highlight) => {
        const isSelected = highlight.id === selectedHighlightId
        const color = highlight.color || 'rgba(255, 235, 59, 0.4)'
        const selectedColor = 'rgba(66, 165, 245, 0.5)'

        return (
          <div
            key={highlight.id}
            className={`absolute pointer-events-auto cursor-pointer transition-all duration-200 ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
            }`}
            style={{
              left: `${highlight.x}%`,
              top: `${highlight.y}%`,
              width: `${highlight.width}%`,
              height: `${highlight.height}%`,
              backgroundColor: isSelected ? selectedColor : color,
              borderRadius: '2px',
            }}
            onClick={() => onHighlightClick?.(highlight)}
            title={highlight.label}
          >
            {isSelected && highlight.label && (
              <div
                className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap z-10"
                style={{ fontSize: `${10 * scale}px` }}
              >
                {highlight.label}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default PdfHighlight

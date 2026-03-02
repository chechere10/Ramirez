import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: TooltipPosition
  delay?: number
  disabled?: boolean
  maxWidth?: number
  className?: string
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false,
  maxWidth = 250,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  const calculatePosition = () => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const gap = 8

    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2
        y = triggerRect.top - gap
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2
        y = triggerRect.bottom + gap
        break
      case 'left':
        x = triggerRect.left - gap
        y = triggerRect.top + triggerRect.height / 2
        break
      case 'right':
        x = triggerRect.right + gap
        y = triggerRect.top + triggerRect.height / 2
        break
    }

    setCoords({ x, y })
  }

  const showTooltip = () => {
    if (disabled) return
    timeoutRef.current = window.setTimeout(() => {
      calculatePosition()
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getTooltipStyles = (): CSSProperties => {
    const styles: CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      maxWidth,
    }

    switch (position) {
      case 'top':
        styles.left = coords.x
        styles.top = coords.y
        styles.transform = 'translate(-50%, -100%)'
        break
      case 'bottom':
        styles.left = coords.x
        styles.top = coords.y
        styles.transform = 'translate(-50%, 0)'
        break
      case 'left':
        styles.left = coords.x
        styles.top = coords.y
        styles.transform = 'translate(-100%, -50%)'
        break
      case 'right':
        styles.left = coords.x
        styles.top = coords.y
        styles.transform = 'translate(0, -50%)'
        break
    }

    return styles
  }

  const arrowClasses: Record<TooltipPosition, string> = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-gray-900 border-x-transparent border-b-transparent',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-gray-900 border-x-transparent border-t-transparent',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent',
    right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent',
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={`inline-block ${className}`}
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          style={getTooltipStyles()}
          className="animate-in fade-in zoom-in-95 duration-150"
          role="tooltip"
        >
          <div className="relative px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg">
            {content}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Componente simple para iconos de ayuda con tooltip
interface HelpTooltipProps {
  content: ReactNode
  className?: string
}

export function HelpTooltip({ content, className = '' }: HelpTooltipProps) {
  return (
    <Tooltip content={content} position="top">
      <span className={`inline-flex items-center justify-center w-4 h-4 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full cursor-help ${className}`}>
        ?
      </span>
    </Tooltip>
  )
}

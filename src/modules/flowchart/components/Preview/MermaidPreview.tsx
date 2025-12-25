/**
 * Mermaid Preview Component
 * Renders Mermaid code as SVG with zoom and pan controls
 */

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import mermaid from 'mermaid'
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react'

interface MermaidPreviewProps {
  code: string
  onError?: (error: string | null) => void
  className?: string
}

export interface MermaidPreviewHandle {
  getSvgContent: () => string | null
  getSvgElement: () => SVGElement | null
}

// Initialize mermaid once
let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 15,
      nodeSpacing: 50,
      rankSpacing: 50,
      useMaxWidth: false,
    },
    themeVariables: {
      // Primary - Light blue background with blue border (for rectangles/process)
      primaryColor: '#e8eeff',
      primaryTextColor: '#0230a8',
      primaryBorderColor: '#0230a8',

      // Secondary - Yellow for decisions/diamonds
      secondaryColor: '#fff8e0',
      secondaryTextColor: '#1a1a1a',
      secondaryBorderColor: '#ffcf00',

      // Tertiary - Light gray for other shapes
      tertiaryColor: '#f5f5f5',
      tertiaryTextColor: '#333333',
      tertiaryBorderColor: '#999999',

      // Lines and arrows - Blue
      lineColor: '#0230a8',
      arrowheadColor: '#0230a8',

      // Background
      background: '#ffffff',
      mainBkg: '#e8eeff',

      // Node styling
      nodeBorder: '#0230a8',
      nodeTextColor: '#0230a8',

      // Cluster/Subgraph styling - Yellow accent
      clusterBkg: '#fffcf0',
      clusterBorder: '#ffcf00',
      titleColor: '#0230a8',

      // Edgelabel
      edgeLabelBackground: '#ffffff',

      // Font
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
    },
  })

  mermaidInitialized = true
}

const MIN_SCALE = 0.1
const MAX_SCALE = 3
const ZOOM_STEP = 0.2

const MermaidPreview = forwardRef<MermaidPreviewHandle, MermaidPreviewProps>(
  function MermaidPreview({ code, onError, className = '' }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const renderIdRef = useRef(0)

  // Expose methods for parent component (export functionality)
  useImperativeHandle(ref, () => ({
    getSvgContent: () => svgContent || null,
    getSvgElement: () => svgContainerRef.current?.querySelector('svg') || null,
  }), [svgContent])

  // Transform state - we store the actual transform values
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, transformX: 0, transformY: 0 })

  // Track if we should auto-fit after render
  const shouldAutoFit = useRef(true)

  const renderDiagram = useCallback(async (mermaidCode: string) => {
    if (!mermaidCode.trim()) {
      setSvgContent('')
      setError(null)
      onError?.(null)
      return
    }

    initMermaid()

    const currentRenderId = ++renderIdRef.current
    const uniqueId = `mermaid-${Date.now()}-${currentRenderId}`

    try {
      await mermaid.parse(mermaidCode)
      if (currentRenderId !== renderIdRef.current) return

      const { svg } = await mermaid.render(uniqueId, mermaidCode)
      if (currentRenderId !== renderIdRef.current) return

      setSvgContent(svg)
      setError(null)
      onError?.(null)
    } catch (err) {
      if (currentRenderId !== renderIdRef.current) return
      const errorMessage = err instanceof Error ? err.message : 'Invalid syntax'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [onError])

  // Debounced render
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      renderDiagram(code)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [code, renderDiagram])

  // Fit to view function
  const fitToView = useCallback(() => {
    const container = containerRef.current
    const svgContainer = svgContainerRef.current
    if (!container || !svgContainer) return

    const svg = svgContainer.querySelector('svg')
    if (!svg) return

    // Get container dimensions
    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // Get SVG natural dimensions
    // First reset transform to measure natural size
    svgContainer.style.transform = 'none'
    const svgRect = svg.getBoundingClientRect()
    const svgWidth = svgRect.width
    const svgHeight = svgRect.height

    if (svgWidth === 0 || svgHeight === 0) {
      setTransform({ x: 0, y: 0, scale: 1 })
      return
    }

    // Calculate scale to fit with padding
    const padding = 80
    const availableWidth = containerWidth - padding
    const availableHeight = containerHeight - padding
    const scaleX = availableWidth / svgWidth
    const scaleY = availableHeight / svgHeight
    const newScale = Math.min(scaleX, scaleY, MAX_SCALE)
    const clampedScale = Math.max(newScale, MIN_SCALE)

    // Calculate position to center
    const scaledWidth = svgWidth * clampedScale
    const scaledHeight = svgHeight * clampedScale
    const x = (containerWidth - scaledWidth) / 2
    const y = (containerHeight - scaledHeight) / 2

    setTransform({ x, y, scale: clampedScale })
  }, [])

  // Auto-fit when SVG content changes (only on first render or when empty->content)
  useEffect(() => {
    if (svgContent && shouldAutoFit.current) {
      // Wait for SVG to be in DOM
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitToView()
          shouldAutoFit.current = false
        })
      })
    }
  }, [svgContent, fitToView])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setTransform(t => {
      const newScale = Math.min(t.scale + ZOOM_STEP, MAX_SCALE)
      // Zoom toward center of container
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const factor = newScale / t.scale
        const newX = centerX - (centerX - t.x) * factor
        const newY = centerY - (centerY - t.y) * factor
        return { x: newX, y: newY, scale: newScale }
      }
      return { ...t, scale: newScale }
    })
  }, [])

  const handleZoomOut = useCallback(() => {
    setTransform(t => {
      const newScale = Math.max(t.scale - ZOOM_STEP, MIN_SCALE)
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const factor = newScale / t.scale
        const newX = centerX - (centerX - t.x) * factor
        const newY = centerY - (centerY - t.y) * factor
        return { x: newX, y: newY, scale: newScale }
      }
      return { ...t, scale: newScale }
    })
  }, [])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      setTransform(t => {
        const newScale = Math.min(Math.max(t.scale + delta, MIN_SCALE), MAX_SCALE)
        const factor = newScale / t.scale
        const newX = mouseX - (mouseX - t.x) * factor
        const newY = mouseY - (mouseY - t.y) * factor
        return { x: newX, y: newY, scale: newScale }
      })
    }
  }, [])

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        transformX: transform.x,
        transformY: transform.y,
      }
    }
  }, [transform.x, transform.y])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.mouseX
    const dy = e.clientY - dragStartRef.current.mouseY
    setTransform(t => ({
      ...t,
      x: dragStartRef.current.transformX + dx,
      y: dragStartRef.current.transformY + dy,
    }))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const zoomPercentage = Math.round(transform.scale * 100)

  return (
    <div
      ref={containerRef}
      className={`relative bg-white overflow-hidden ${className}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'default' }}
    >
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 p-1">
        <button
          onClick={handleZoomOut}
          disabled={transform.scale <= MIN_SCALE}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={16} className="text-gray-600" />
        </button>

        <span className="px-2 text-xs font-medium text-gray-600 min-w-[48px] text-center">
          {zoomPercentage}%
        </span>

        <button
          onClick={handleZoomIn}
          disabled={transform.scale >= MAX_SCALE}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={16} className="text-gray-600" />
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          onClick={fitToView}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          title="Fit to view"
        >
          <Maximize2 size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Pan hint */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-2 py-1 bg-white/80 backdrop-blur-sm rounded text-[10px] text-gray-400 border border-gray-100">
        <Move size={12} />
        <span>Alt + drag to pan</span>
      </div>

      {/* Error overlay */}
      {error && (
        <div className="absolute top-14 left-3 right-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 z-10">
          {error}
        </div>
      )}

      {/* SVG content */}
      {svgContent ? (
        <div
          ref={svgContainerRef}
          className="absolute top-0 left-0"
          style={{
            transformOrigin: '0 0',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          {code.trim() ? 'Rendering...' : 'Enter Mermaid code to see preview'}
        </div>
      )}
    </div>
  )
})

export default MermaidPreview

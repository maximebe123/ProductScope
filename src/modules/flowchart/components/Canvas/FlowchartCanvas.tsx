/**
 * Flowchart Canvas Component
 * Split pane with Mermaid editor and live preview
 */

import { useState, useCallback, useRef } from 'react'
import { GripVertical, Code, MessageCircle, Paintbrush } from 'lucide-react'
import MermaidEditor from '../Editor/MermaidEditor'
import MermaidPreview, { type MermaidPreviewHandle } from '../Preview/MermaidPreview'
import FlowchartDock from '../Toolbar/FlowchartDock'
import FlowchartChatView from '../Chat/FlowchartChatView'
import { StylePanel } from '../StylePanel'
import { insertStyleInCode } from '../../utils/styleHelpers'
import { fixFlowchartSyntax } from '../../../../services/flowchartApi'

export type FlowchartTab = 'code' | 'chat'

interface FlowchartCanvasProps {
  mermaidCode: string
  onCodeChange: (code: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  lastSaved?: Date | null
  className?: string
  activeTab?: FlowchartTab
  onTabChange?: (tab: FlowchartTab) => void
}

export default function FlowchartCanvas({
  mermaidCode,
  onCodeChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  lastSaved,
  className = '',
  activeTab: controlledTab,
  onTabChange,
}: FlowchartCanvasProps) {
  const [splitPosition, setSplitPosition] = useState(33.33) // percentage (1/3 left, 2/3 right)
  const [isDragging, setIsDragging] = useState(false)
  const [syntaxError, setSyntaxError] = useState<string | null>(null)
  const [internalTab, setInternalTab] = useState<FlowchartTab>('chat') // Default to chat view
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false)
  const [isFixingSyntax, setIsFixingSyntax] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<MermaidPreviewHandle>(null)

  // Support both controlled and uncontrolled modes
  const activeTab = controlledTab ?? internalTab
  const handleTabChange = (tab: FlowchartTab) => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalTab(tab)
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100

      // Clamp between 20% and 80%
      setSplitPosition(Math.max(20, Math.min(80, newPosition)))
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleExportPng = useCallback(async (transparent: boolean = true): Promise<Blob | null> => {
    // Get SVG content from the preview component
    const svgContent = previewRef.current?.getSvgContent()
    if (!svgContent) return null

    try {
      // Parse the SVG to get dimensions
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml')
      const svgElement = svgDoc.querySelector('svg')
      if (!svgElement) return null

      // Get SVG dimensions
      const viewBox = svgElement.getAttribute('viewBox')
      let width = parseFloat(svgElement.getAttribute('width') || '800')
      let height = parseFloat(svgElement.getAttribute('height') || '600')

      // If viewBox exists but no explicit dimensions, use viewBox
      if (viewBox && (!svgElement.getAttribute('width') || svgElement.getAttribute('width')?.includes('%'))) {
        const parts = viewBox.split(' ')
        if (parts.length >= 4) {
          width = parseFloat(parts[2])
          height = parseFloat(parts[3])
        }
      }

      // Set explicit dimensions on the SVG for proper rendering
      svgElement.setAttribute('width', String(width))
      svgElement.setAttribute('height', String(height))

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const svgData = new XMLSerializer().serializeToString(svgElement)
      const img = new Image()

      return new Promise((resolve) => {
        img.onload = () => {
          canvas.width = width * 2
          canvas.height = height * 2
          ctx.scale(2, 2)
          // Only fill background if not transparent
          if (!transparent) {
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((blob) => resolve(blob), 'image/png')
        }
        img.onerror = () => resolve(null)
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
      })
    } catch {
      return null
    }
  }, [])

  const handleExportSvg = useCallback((): Blob | null => {
    const svgContent = previewRef.current?.getSvgContent()
    if (!svgContent) return null

    return new Blob([svgContent], { type: 'image/svg+xml' })
  }, [])

  const handleExportMermaid = useCallback((): string => {
    return mermaidCode
  }, [mermaidCode])

  const handleInsertStyle = useCallback(
    (styleLine: string) => {
      const newCode = insertStyleInCode(mermaidCode, styleLine)
      onCodeChange(newCode)
    },
    [mermaidCode, onCodeChange]
  )

  const handleFixSyntax = useCallback(async () => {
    if (!syntaxError || isFixingSyntax) return

    setIsFixingSyntax(true)
    try {
      const result = await fixFlowchartSyntax(mermaidCode, syntaxError)
      if (result.success && result.mermaid_code) {
        onCodeChange(result.mermaid_code)
      }
    } catch (error) {
      console.error('Failed to fix syntax:', error)
    } finally {
      setIsFixingSyntax(false)
    }
  }, [mermaidCode, syntaxError, isFixingSyntax, onCodeChange])

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full ${className}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Editor/Chat pane */}
      <div
        className="h-full overflow-hidden border-r border-gray-200 flex flex-col"
        style={{ width: `${splitPosition}%` }}
      >
        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => handleTabChange('chat')}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium
              transition-colors border-b-2 -mb-px
              ${activeTab === 'chat'
                ? 'bg-white text-primary border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <MessageCircle size={16} />
            Chat
          </button>
          <button
            onClick={() => handleTabChange('code')}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium
              transition-colors border-b-2 -mb-px
              ${activeTab === 'code'
                ? 'bg-white text-primary border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <Code size={16} />
            Code
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setIsStylePanelOpen(!isStylePanelOpen)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium
              transition-colors border-b-2 -mb-px
              ${isStylePanelOpen
                ? 'bg-white text-primary border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
              }
            `}
            title="Style Panel"
          >
            <Paintbrush size={16} />
            Style
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {activeTab === 'code' ? (
            <MermaidEditor value={mermaidCode} onChange={onCodeChange} />
          ) : (
            <FlowchartChatView />
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        className={`
          absolute top-0 bottom-0 w-4 -ml-2 cursor-col-resize z-10
          flex items-center justify-center
          ${isDragging ? 'bg-primary/10' : 'hover:bg-gray-100'}
          transition-colors
        `}
        style={{ left: `${splitPosition}%` }}
        onMouseDown={handleMouseDown}
      >
        <div className="p-1 rounded bg-gray-100 border border-gray-200">
          <GripVertical size={12} className="text-gray-400" />
        </div>
      </div>

      {/* Preview pane */}
      <div
        className="relative h-full overflow-auto bg-white"
        style={{ width: `${100 - splitPosition}%` }}
      >
        <MermaidPreview
          ref={previewRef}
          code={mermaidCode}
          onError={setSyntaxError}
          className="h-full"
        />

        {/* Dock toolbar - centered in preview pane */}
        <FlowchartDock
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onExportPng={handleExportPng}
          onExportSvg={handleExportSvg}
          onExportMermaid={handleExportMermaid}
          lastSaved={lastSaved}
          hasError={!!syntaxError}
          errorMessage={syntaxError}
          onFixSyntax={handleFixSyntax}
          isFixing={isFixingSyntax}
        />

        {/* Style Panel */}
        <StylePanel
          mermaidCode={mermaidCode}
          onInsertStyle={handleInsertStyle}
          isOpen={isStylePanelOpen}
          onClose={() => setIsStylePanelOpen(false)}
        />
      </div>
    </div>
  )
}

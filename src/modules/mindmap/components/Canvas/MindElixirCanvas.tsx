/**
 * MindElixir Canvas Component
 * Native mind map canvas with built-in keyboard shortcuts
 */

import { useEffect, useRef } from 'react'
import MindElixir from 'mind-elixir'
import 'mind-elixir/style.css'

import type { MindElixirData, MindElixirInstance, NodeObj } from '../../types/mindElixir'
import { PRODUCTSCOPE_THEME, NOTE_STYLE } from '../../types/mindElixir'
import { createNewMindMap, generateId } from '../../utils/dataConverters'
import { MindMapDock } from '../Toolbar/MindMapDock'

interface MindElixirCanvasProps {
  /**
   * Initial data to load
   */
  initialData?: MindElixirData | null
  /**
   * Called when any operation changes the data
   */
  onDataChange?: (data: MindElixirData) => void
  /**
   * Called when a node is selected
   */
  onNodeSelect?: (node: NodeObj | null) => void
  /**
   * Called when the instance is ready
   */
  onInstanceReady?: (instance: MindElixirInstance) => void
  /**
   * Last saved timestamp for dock indicator
   */
  lastSaved?: Date | null
  /**
   * Additional CSS classes
   */
  className?: string
}

export default function MindElixirCanvas({
  initialData,
  onDataChange,
  onNodeSelect,
  onInstanceReady,
  lastSaved,
  className = '',
}: MindElixirCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mindRef = useRef<MindElixirInstance | null>(null)
  const initializedRef = useRef(false)

  // Store callbacks in refs to avoid re-initializing MindElixir when they change
  const onDataChangeRef = useRef(onDataChange)
  const onNodeSelectRef = useRef(onNodeSelect)
  const onInstanceReadyRef = useRef(onInstanceReady)
  const initialDataRef = useRef(initialData)

  // Keep refs up to date
  useEffect(() => {
    onDataChangeRef.current = onDataChange
    onNodeSelectRef.current = onNodeSelect
    onInstanceReadyRef.current = onInstanceReady
  }, [onDataChange, onNodeSelect, onInstanceReady])

  // Initialize MindElixir (only once on mount)
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return

    const mind = new MindElixir({
      el: containerRef.current,
      direction: MindElixir.RIGHT,
      draggable: true,
      editable: true,
      contextMenu: true,
      toolBar: false,
      keypress: true,
      allowUndo: true,
      locale: 'en',
      theme: PRODUCTSCOPE_THEME,
      newTopicName: 'New Branch',
    })

    // Initialize with data or default
    const data = initialDataRef.current || createNewMindMap('Central Topic')
    mind.init(data)

    // Listen for operations
    mind.bus.addListener('operation', () => {
      onDataChangeRef.current?.(mind.getData())
    })

    // Listen for node selection
    mind.bus.addListener('selectNodes', (nodes: NodeObj[]) => {
      onNodeSelectRef.current?.(nodes.length > 0 ? nodes[0] : null)
    })

    mind.bus.addListener('unselectNodes', () => {
      onNodeSelectRef.current?.(null)
    })

    mindRef.current = mind
    initializedRef.current = true
    onInstanceReadyRef.current?.(mind)

    // Notify parent of initial data (for AI integration)
    onDataChangeRef.current?.(mind.getData())

    // Cleanup
    return () => {
      mind.destroy()
      mindRef.current = null
      initializedRef.current = false
    }
  }, [])

  // Handle external data changes
  useEffect(() => {
    if (!mindRef.current || !initialData || !initializedRef.current) return

    // Only refresh if the data has actually changed
    const currentData = mindRef.current.getData()
    if (JSON.stringify(currentData) !== JSON.stringify(initialData)) {
      mindRef.current.refresh(initialData)
    }
  }, [initialData])

  // Add custom keyboard shortcut for notes (Ctrl+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mindRef.current) return

      // Ctrl+N or Cmd+N to add a note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        const currentNode = mindRef.current.currentNode
        if (currentNode) {
          mindRef.current.addChild(currentNode, {
            id: generateId(),
            topic: 'Note',
            style: NOTE_STYLE,
          })
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Dock handlers
  const handleUndo = () => mindRef.current?.undo()
  const handleRedo = () => mindRef.current?.redo()
  const handleFitView = () => mindRef.current?.scaleFit()
  // Export with transparent background using injected CSS
  const transparentBgCss = '.map-container { background: transparent !important; } .map-canvas { background: transparent !important; }'
  const handleExportPng = async () => mindRef.current?.exportPng(false, transparentBgCss) ?? null
  const handleExportSvg = () => mindRef.current?.exportSvg(false, transparentBgCss) ?? null
  const handleGetData = () => mindRef.current?.getData() ?? null
  const handleImport = (data: MindElixirData) => {
    if (mindRef.current) {
      mindRef.current.refresh(data)
      onDataChange?.(data)
    }
  }

  return (
    <div
      className={`mind-elixir-canvas flex-1 min-h-0 ${className}`}
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
        }}
      />
      <MindMapDock
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFitView={handleFitView}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onGetData={handleGetData}
        onImport={handleImport}
        lastSaved={lastSaved}
      />
    </div>
  )
}

/**
 * Style Panel Component
 * Main panel for styling flowchart nodes and edges
 */

import { useState, useMemo } from 'react'
import { X, Paintbrush, Wand2 } from 'lucide-react'
import ColorPicker from './ColorPicker'
import ThemePalette from './ThemePalette'
import {
  generateNodeStyle,
  generateClassDef,
  generateClassAssignment,
  extractNodeIds,
  STYLE_THEMES,
  type NodeStyleOptions,
} from '../../utils/styleHelpers'

interface StylePanelProps {
  mermaidCode: string
  onInsertStyle: (styleLine: string) => void
  isOpen: boolean
  onClose: () => void
}

export default function StylePanel({
  mermaidCode,
  onInsertStyle,
  isOpen,
  onClose,
}: StylePanelProps) {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [fillColor, setFillColor] = useState('#ffffff')
  const [strokeColor, setStrokeColor] = useState('#333333')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [selectedThemeId, setSelectedThemeId] = useState<string>()
  const [className, setClassName] = useState('')
  const [mode, setMode] = useState<'style' | 'class'>('style')

  // Extract node IDs from the code
  const nodeIds = useMemo(() => extractNodeIds(mermaidCode), [mermaidCode])

  if (!isOpen) return null

  const handleNodeToggle = (nodeId: string) => {
    setSelectedNodes((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    )
  }

  const handleSelectAllNodes = () => {
    setSelectedNodes(nodeIds)
  }

  const handleClearSelection = () => {
    setSelectedNodes([])
  }

  const handleThemeSelect = (theme: (typeof STYLE_THEMES)[number]) => {
    setFillColor(theme.fill)
    setStrokeColor(theme.stroke)
    setStrokeWidth(theme.strokeWidth)
    setSelectedThemeId(theme.id)
  }

  const handleApplyStyle = () => {
    if (selectedNodes.length === 0) return

    const options: NodeStyleOptions = {
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth,
    }

    if (mode === 'style') {
      // Apply inline style to each selected node
      for (const nodeId of selectedNodes) {
        const styleLine = generateNodeStyle(nodeId, options)
        if (styleLine) {
          onInsertStyle(styleLine)
        }
      }
    } else if (mode === 'class' && className) {
      // Create class definition and apply to nodes
      const classDefLine = generateClassDef(className, options)
      const classAssignLine = generateClassAssignment(selectedNodes, className)

      if (classDefLine) {
        onInsertStyle(classDefLine)
      }
      if (classAssignLine) {
        onInsertStyle(classAssignLine)
      }
    }

    // Clear selection after applying
    setSelectedNodes([])
    setSelectedThemeId(undefined)
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Paintbrush size={18} className="text-primary" />
          <h3 className="font-semibold text-gray-800">Style Panel</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('style')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'style'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Inline Style
          </button>
          <button
            onClick={() => setMode('class')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'class'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Class Definition
          </button>
        </div>

        {/* Class name input (only in class mode) */}
        {mode === 'class' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Class Name</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="e.g., highlight, success, error"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* Node selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">Select Nodes</label>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAllNodes}
                className="text-xs text-primary hover:underline"
              >
                Select all
              </button>
              <button
                onClick={handleClearSelection}
                className="text-xs text-gray-500 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {nodeIds.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No nodes found in the flowchart</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
              {nodeIds.map((nodeId) => (
                <button
                  key={nodeId}
                  onClick={() => handleNodeToggle(nodeId)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedNodes.includes(nodeId)
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  {nodeId}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme palette */}
        <ThemePalette onSelectTheme={handleThemeSelect} selectedThemeId={selectedThemeId} />

        {/* Color pickers */}
        <ColorPicker label="Fill Color" value={fillColor} onChange={setFillColor} />
        <ColorPicker label="Stroke Color" value={strokeColor} onChange={setStrokeColor} />

        {/* Stroke width */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">
            Stroke Width: {strokeWidth}px
          </label>
          <input
            type="range"
            min={1}
            max={8}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Preview</label>
          <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-center">
            <div
              className="px-6 py-3 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: fillColor,
                border: `${strokeWidth}px solid ${strokeColor}`,
              }}
            >
              Sample Node
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleApplyStyle}
          disabled={selectedNodes.length === 0 || (mode === 'class' && !className)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Wand2 size={18} />
          Apply Style
          {selectedNodes.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
              {selectedNodes.length} node{selectedNodes.length > 1 ? 's' : ''}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

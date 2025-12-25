import { useState, useEffect } from 'react'
import { Edge } from 'reactflow'
import { X, ArrowRight, RefreshCw, Tag } from 'lucide-react'
import { nodeTypes, categories } from '../../config/nodeConfig'
import { CustomEdgeData } from '../Edges/CustomEdge'

interface EdgePropertiesPanelProps {
  selectedEdge: Edge<CustomEdgeData>
  onToggleColorMode: (edgeId: string) => void
  onUpdateLabel: (edgeId: string, label: string) => void
  onClose: () => void
}

const EdgePropertiesPanel = ({
  selectedEdge,
  onToggleColorMode,
  onUpdateLabel,
  onClose,
}: EdgePropertiesPanelProps) => {
  const colorFromTarget = selectedEdge.data?.colorFromTarget || false
  const sourceNodeType = selectedEdge.data?.sourceNodeType
  const targetNodeType = selectedEdge.data?.targetNodeType

  // Local state for label editing
  const [label, setLabel] = useState(selectedEdge.data?.label || '')

  // Sync label when selected edge changes
  useEffect(() => {
    setLabel(selectedEdge.data?.label || '')
  }, [selectedEdge.id, selectedEdge.data?.label])

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel)
    onUpdateLabel(selectedEdge.id, newLabel)
  }

  // Get colors for source and target
  const getNodeColor = (nodeType?: string) => {
    if (!nodeType) return { color: '#94a3b8', bgLight: '#f1f5f9', label: 'Unknown' }
    const config = nodeTypes[nodeType as keyof typeof nodeTypes]
    if (config) {
      const category = categories[config.category]
      return { color: category.color, bgLight: category.bgLight, label: config.label }
    }
    return { color: '#94a3b8', bgLight: '#f1f5f9', label: nodeType }
  }

  const sourceInfo = getNodeColor(sourceNodeType)
  const targetInfo = getNodeColor(targetNodeType)
  const activeColor = colorFromTarget ? targetInfo.color : sourceInfo.color

  return (
    <div className="absolute top-0 right-0 z-20 w-80 bg-white border-l border-gray-200 h-full flex flex-col animate-slide-in shadow-lg">
      {/* Header */}
      <div
        className="flex-shrink-0 p-4 flex items-center justify-between border-b border-gray-100"
        style={{ backgroundColor: `${activeColor}15` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: activeColor, color: 'white' }}
          >
            <ArrowRight size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Connection</h2>
            <p className="text-xs" style={{ color: activeColor }}>
              Edge properties
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/50 rounded-md transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-5">
          {/* Connection info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Connection
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center"
                style={{ backgroundColor: sourceInfo.bgLight, color: sourceInfo.color }}
              >
                {sourceInfo.label}
              </div>
              <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
              <div
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-center"
                style={{ backgroundColor: targetInfo.bgLight, color: targetInfo.color }}
              >
                {targetInfo.label}
              </div>
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label
            </label>
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g., HTTP, gRPC, async..."
                className="
                  flex-1 px-3 py-2 rounded-lg text-sm
                  border border-gray-200
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  transition-all
                "
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Optional label displayed on the connection
            </p>
          </div>

          {/* Color source toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Edge Color
            </label>
            <div className="space-y-2">
              <button
                onClick={() => !colorFromTarget || onToggleColorMode(selectedEdge.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  border-2 transition-all
                  ${!colorFromTarget
                    ? 'border-current bg-opacity-10'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                style={!colorFromTarget ? {
                  borderColor: sourceInfo.color,
                  backgroundColor: `${sourceInfo.color}10`
                } : {}}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sourceInfo.color }}
                />
                <span className="text-sm font-medium text-gray-700">
                  From source ({sourceInfo.label})
                </span>
                {!colorFromTarget && (
                  <span className="ml-auto text-xs text-gray-500">Active</span>
                )}
              </button>

              <button
                onClick={() => colorFromTarget || onToggleColorMode(selectedEdge.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  border-2 transition-all
                  ${colorFromTarget
                    ? 'border-current bg-opacity-10'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                style={colorFromTarget ? {
                  borderColor: targetInfo.color,
                  backgroundColor: `${targetInfo.color}10`
                } : {}}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: targetInfo.color }}
                />
                <span className="text-sm font-medium text-gray-700">
                  From target ({targetInfo.label})
                </span>
                {colorFromTarget && (
                  <span className="ml-auto text-xs text-gray-500">Active</span>
                )}
              </button>
            </div>

            <button
              onClick={() => onToggleColorMode(selectedEdge.id)}
              className="
                mt-3 w-full flex items-center justify-center gap-2
                px-3 py-2 rounded-lg
                bg-gray-100 hover:bg-gray-200
                text-sm font-medium text-gray-600
                transition-colors
              "
            >
              <RefreshCw size={14} />
              Switch color source
            </button>
          </div>

          {/* Edge ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Edge ID
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-500 font-mono">
              {selectedEdge.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EdgePropertiesPanel

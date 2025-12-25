import { useState, useEffect, useCallback } from 'react'
import { Node } from 'reactflow'
import { X, Trash2, Layers } from 'lucide-react'
import { nodeTypes, categories } from '../../config/nodeConfig'
import { BaseNodeData, VolumeAttachment } from '../Nodes/BaseNode'
import NodeTagEditor from './NodeTagEditor'
import NodeVolumeEditor from './NodeVolumeEditor'

interface NodePropertiesPanelProps {
  selectedNode: Node<BaseNodeData> | null
  onUpdateLabel: (nodeId: string, newLabel: string) => void
  onAddTag: (nodeId: string, tag: string) => void
  onRemoveTag: (nodeId: string, tagIndex: number) => void
  onAddVolume: (nodeId: string, volume: VolumeAttachment) => void
  onRemoveVolume: (nodeId: string, volumeIndex: number) => void
  onDeleteNode: (nodeId: string) => void
  onClose: () => void
}

const NodePropertiesPanel = ({
  selectedNode,
  onUpdateLabel,
  onAddTag,
  onRemoveTag,
  onAddVolume,
  onRemoveVolume,
  onDeleteNode,
  onClose,
}: NodePropertiesPanelProps) => {
  const [label, setLabel] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [volumeName, setVolumeName] = useState('')
  const [volumePath, setVolumePath] = useState('')

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label)
      setTagInput('')
      setVolumeName('')
      setVolumePath('')
    }
  }, [selectedNode])

  // All hooks must be called before any early return
  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && selectedNode) {
      onAddTag(selectedNode.id, trimmedTag)
      setTagInput('')
    }
  }, [tagInput, selectedNode, onAddTag])

  const handleAddVolume = useCallback(() => {
    const trimmedName = volumeName.trim()
    const trimmedPath = volumePath.trim()
    if (trimmedName && trimmedPath && selectedNode) {
      onAddVolume(selectedNode.id, { name: trimmedName, mountPath: trimmedPath })
      setVolumeName('')
      setVolumePath('')
    }
  }, [volumeName, volumePath, selectedNode, onAddVolume])

  if (!selectedNode) {
    return null
  }

  // Handle group nodes differently
  const isGroup = selectedNode.type === 'groupNode'
  const config = isGroup ? null : nodeTypes[selectedNode.data.nodeType]
  const category = config ? categories[config.category] : null
  const Icon = config ? config.icon : Layers

  // Default colors for groups
  const groupColor = '#0230a8'
  const groupBgLight = '#e8edf8'

  const handleLabelBlur = () => {
    if (label.trim() && label !== selectedNode.data.label) {
      onUpdateLabel(selectedNode.id, label.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      handleLabelBlur()
    }
  }

  const tags = selectedNode.data.tags || []
  const volumes = selectedNode.data.volumes || []

  // Use category colors or group defaults
  const activeColor = category?.color ?? groupColor
  const activeBgLight = category?.bgLight ?? groupBgLight

  return (
    <div className="absolute top-0 right-0 z-20 w-80 bg-white border-l border-gray-200 h-full flex flex-col animate-slide-in shadow-lg">
      {/* Header with category color */}
      <div
        className="flex-shrink-0 p-4 flex items-center justify-between border-b border-gray-100"
        style={{ backgroundColor: activeBgLight }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: activeColor, color: 'white' }}
          >
            <Icon size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              {isGroup ? 'Group' : config?.label}
            </h2>
            <p className="text-xs" style={{ color: activeColor }}>
              {isGroup ? 'Container' : category?.label}
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
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={handleKeyDown}
              className="
                w-full px-3 py-2
                border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:border-transparent
                text-sm transition-shadow
              "
              style={{
                // @ts-expect-error CSS custom property
                '--tw-ring-color': `${activeColor}40`,
              }}
            />
          </div>

          {/* Tags */}
          <NodeTagEditor
            tags={tags}
            tagInput={tagInput}
            activeColor={activeColor}
            activeBgLight={activeBgLight}
            onTagInputChange={setTagInput}
            onAddTag={handleAddTag}
            onRemoveTag={(index) => onRemoveTag(selectedNode.id, index)}
          />

          {/* Volumes */}
          <NodeVolumeEditor
            volumes={volumes}
            volumeName={volumeName}
            volumePath={volumePath}
            onVolumeNameChange={setVolumeName}
            onVolumePathChange={setVolumePath}
            onAddVolume={handleAddVolume}
            onRemoveVolume={(index) => onRemoveVolume(selectedNode.id, index)}
          />

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div
              className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ backgroundColor: activeBgLight, color: activeColor }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeColor }}
              />
              {isGroup ? 'Group' : config?.label}
            </div>
          </div>

          {/* Category */}
          {!isGroup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                {category?.label}
              </div>
            </div>
          )}

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                X: {Math.round(selectedNode.position.x)}
              </div>
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                Y: {Math.round(selectedNode.position.y)}
              </div>
            </div>
          </div>

          {/* Node ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Node ID</label>
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-500 font-mono">
              {selectedNode.id}
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="
            w-full flex items-center justify-center gap-2
            px-4 py-2.5 rounded-lg
            bg-danger/10 text-danger
            hover:bg-danger hover:text-white
            transition-colors duration-150
            text-sm font-medium
          "
        >
          <Trash2 size={16} />
          Delete Node
        </button>
      </div>
    </div>
  )
}

export default NodePropertiesPanel

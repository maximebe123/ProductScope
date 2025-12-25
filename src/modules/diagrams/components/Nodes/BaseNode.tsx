import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { FolderOpen } from 'lucide-react'
import { NodeTypeId, nodeTypes, categories } from '../../config/nodeConfig'

export interface VolumeAttachment {
  name: string
  mountPath: string
}

export interface BaseNodeData {
  label: string
  nodeType: NodeTypeId
  tags?: string[]
  isGroup?: boolean
  volumes?: VolumeAttachment[]
  onLabelChange?: (nodeId: string, newLabel: string) => void
}

const BaseNode = ({ id, data, selected }: NodeProps<BaseNodeData>) => {
  const { label, nodeType, tags, volumes, onLabelChange } = data
  // Handle null values from AI responses (default params only work for undefined)
  const safeTags = tags ?? []
  const safeVolumes = volumes ?? []
  const config = nodeTypes[nodeType]
  const category = categories[config.category]
  const Icon = config.icon

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(label)
  }, [label])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (editValue.trim() && editValue !== label && onLabelChange) {
      onLabelChange(id, editValue.trim())
    } else {
      setEditValue(label)
    }
  }, [editValue, label, id, onLabelChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setEditValue(label)
      setIsEditing(false)
    }
  }, [handleBlur, label])

  const handleStyle = {
    backgroundColor: selected ? category.color : '#94a3b8',
    width: 10,
    height: 10,
  }

  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-md border
        min-w-[180px] transition-all duration-150 overflow-hidden
        ${selected ? 'shadow-lg ring-2 ring-offset-1' : 'hover:shadow-lg'}
      `}
      style={{
        borderColor: selected ? category.color : '#e2e8f0',
        // @ts-expect-error CSS custom property
        '--tw-ring-color': category.color,
      }}
    >
      {/* Color bar on left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: category.color }}
      />

      {/* Top handle (target) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={handleStyle}
      />

      {/* Left handle (target) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={handleStyle}
      />

      <div className="flex items-center gap-3 pl-4 pr-4 py-3">
        <div
          className="p-2 rounded-lg transition-colors duration-150"
          style={{
            backgroundColor: category.bgLight,
            color: category.color,
          }}
        >
          <Icon size={20} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="
                w-full px-2 py-1 text-sm font-medium
                border rounded outline-none
                bg-white
              "
              style={{ borderColor: category.color }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onDoubleClick={handleDoubleClick}
              className="block text-sm font-medium text-gray-800 cursor-text select-none truncate"
            >
              {label}
            </span>
          )}
          <span className="block text-xs text-gray-400 mt-0.5">
            {config.label}
          </span>
        </div>
      </div>

      {/* Tags */}
      {safeTags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {safeTags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: category.bgLight,
                color: category.color,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Volumes */}
      {safeVolumes.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-100 pt-2">
          <div className="space-y-1.5">
            {safeVolumes.map((vol, index) => (
              <div key={index} className="flex items-start gap-2">
                <FolderOpen size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">
                    {vol.name}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {vol.mountPath}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right handle (source) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={handleStyle}
      />

      {/* Bottom handle (source) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={handleStyle}
      />
    </div>
  )
}

export default memo(BaseNode)

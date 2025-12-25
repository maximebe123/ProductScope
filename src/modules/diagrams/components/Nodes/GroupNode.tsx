import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow'
import { Layers, FolderOpen } from 'lucide-react'
import { VolumeAttachment } from './BaseNode'

export interface GroupNodeData {
  label: string
  isGroup: boolean
  volumes?: VolumeAttachment[]
  onLabelChange?: (nodeId: string, newLabel: string) => void
}

const GroupNode = ({ id, data, selected }: NodeProps<GroupNodeData>) => {
  const { label, volumes = [], onLabelChange } = data
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        handleBlur()
      } else if (e.key === 'Escape') {
        setEditValue(label)
        setIsEditing(false)
      }
    },
    [handleBlur, label]
  )

  const handleStyle = {
    backgroundColor: selected ? '#0230a8' : '#94a3b8',
    width: 10,
    height: 10,
  }

  return (
    <>
      <NodeResizer
        minWidth={250}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-primary"
        handleClassName="!w-3 !h-3 !bg-primary !border-2 !border-white !rounded"
      />

      <div
        className={`
          w-full h-full
          border-2 border-dashed rounded-xl
          transition-all duration-150
          ${selected ? 'border-primary bg-primary/5' : 'border-gray-300 bg-gray-50/50'}
        `}
        style={{ pointerEvents: 'none' }}
      >
        {/* Header - needs pointer events for interactions */}
        <div
          className={`
            flex items-center gap-2 px-3 py-2
            border-b border-dashed
            ${selected ? 'border-primary/30' : 'border-gray-200'}
          `}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className={`
              p-1.5 rounded-md
              ${selected ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}
            `}
          >
            <Layers size={16} />
          </div>

          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="
                flex-1 px-2 py-0.5 text-sm font-medium
                border border-primary rounded outline-none
                bg-white
              "
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onDoubleClick={handleDoubleClick}
              className={`
                text-sm font-medium cursor-text select-none
                ${selected ? 'text-primary' : 'text-gray-600'}
              `}
            >
              {label}
            </span>
          )}

          {/* Volumes indicator in header */}
          {volumes.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <FolderOpen size={12} className="text-amber-500" />
              <span className="text-xs text-gray-400">{volumes.length}</span>
            </div>
          )}
        </div>

        {/* Volumes detail section */}
        {volumes.length > 0 && (
          <div className="px-3 py-2 space-y-1" style={{ pointerEvents: 'auto' }}>
            {volumes.map((vol, index) => (
              <div key={index} className="flex items-start gap-2">
                <FolderOpen size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-600 truncate">
                    {vol.name}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {vol.mountPath}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ ...handleStyle, top: -5 }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{ ...handleStyle, left: -5 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ ...handleStyle, right: -5 }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ ...handleStyle, bottom: -5 }}
        />
      </div>
    </>
  )
}

export default memo(GroupNode)

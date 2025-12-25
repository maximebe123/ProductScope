import { DragEvent, memo } from 'react'
import type { CategoryConfig, NodeTypeConfig, NodeTypeId } from '../../config/nodeConfig'

interface DraggableNodeItemProps {
  node: NodeTypeConfig
  category: CategoryConfig
  onDragStart: (event: DragEvent, nodeTypeId: NodeTypeId) => void
  compact?: boolean
}

const DraggableNodeItem = memo(function DraggableNodeItem({
  node,
  category,
  onDragStart,
  compact = false,
}: DraggableNodeItemProps) {
  const Icon = node.icon

  if (compact) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, node.id)}
        className="
          flex items-center gap-2 p-2 rounded-lg
          bg-gray-50/50 border border-transparent
          cursor-grab active:cursor-grabbing
          hover:border-gray-200 hover:bg-white hover:shadow-sm
          transition-all duration-150
        "
      >
        <div
          className="p-1 rounded"
          style={{
            backgroundColor: category.bgLight,
            color: category.color,
          }}
        >
          <Icon size={14} strokeWidth={2} />
        </div>
        <span className="text-sm text-gray-700 truncate">{node.label}</span>
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node.id)}
      className="
        flex items-center gap-3 p-2.5 rounded-lg
        bg-gray-50 border border-transparent
        cursor-grab active:cursor-grabbing
        hover:border-gray-200 hover:bg-white hover:shadow-sm
        transition-all duration-150
      "
    >
      <div
        className="p-1.5 rounded-md"
        style={{
          backgroundColor: category.bgLight,
          color: category.color,
        }}
      >
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700 truncate">{node.label}</div>
        <div className="text-xs text-gray-400 truncate">{node.description}</div>
      </div>
    </div>
  )
})

export default DraggableNodeItem

import { DragEvent, memo, useState } from 'react'
import type { CategoryConfig, NodeTypeConfig, NodeTypeId } from '../../config/nodeConfig'
import DraggableNodeItem from './DraggableNodeItem'

interface CollapsedCategoryButtonProps {
  category: CategoryConfig
  nodes: NodeTypeConfig[]
  onDragStart: (event: DragEvent, nodeTypeId: NodeTypeId) => void
}

const CollapsedCategoryButton = memo(function CollapsedCategoryButton({
  category,
  nodes,
  onDragStart,
}: CollapsedCategoryButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const Icon = category.icon

  return (
    <div
      className="relative px-2 py-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon button */}
      <button
        className="
          w-full p-2.5 rounded-xl flex items-center justify-center
          hover:bg-gray-100 transition-all duration-150
          group
        "
        title={category.label}
      >
        <div
          className="p-1.5 rounded-lg transition-transform duration-150 group-hover:scale-110"
          style={{
            backgroundColor: category.bgLight,
            color: category.color,
          }}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
      </button>

      {/* Popover */}
      {isHovered && (
        <div
          className="
            absolute left-full top-0 ml-2 w-52
            bg-white rounded-xl shadow-xl border border-gray-100
            p-2 z-50
            animate-fade-in
          "
          style={{
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          {/* Category header */}
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {category.label}
            </span>
          </div>

          {/* Nodes list */}
          <div className="space-y-1">
            {nodes.map((node) => (
              <DraggableNodeItem
                key={node.id}
                node={node}
                category={category}
                onDragStart={onDragStart}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default CollapsedCategoryButton

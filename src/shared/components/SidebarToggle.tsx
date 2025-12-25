import { memo } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'

interface SidebarToggleProps {
  isCollapsed: boolean
  onToggle: () => void
  expandLabel?: string
  collapseLabel?: string
}

const SidebarToggle = memo(function SidebarToggle({
  isCollapsed,
  onToggle,
  collapseLabel = 'Réduire',
}: SidebarToggleProps) {
  return (
    <div className="border-t border-gray-200">
      <button
        onClick={onToggle}
        className="
          w-full flex items-center justify-center gap-2
          py-3 bg-gray-50 hover:bg-gray-100
          transition-all duration-200
          group
        "
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <div
          className="
            p-1.5 rounded-lg
            bg-white border border-gray-200 shadow-sm
            group-hover:border-primary/30 group-hover:shadow-md
            transition-all duration-200
          "
        >
          {isCollapsed ? (
            <ChevronsRight
              size={16}
              className="text-gray-400 group-hover:text-primary transition-colors"
            />
          ) : (
            <ChevronsLeft
              size={16}
              className="text-gray-400 group-hover:text-primary transition-colors"
            />
          )}
        </div>
        {!isCollapsed && (
          <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
            {collapseLabel}
          </span>
        )}
      </button>
    </div>
  )
})

export default SidebarToggle

import { DragEvent, useState, useMemo } from 'react'
import { ChevronDown, Search, ChevronRight as ChevronRightIcon } from 'lucide-react'
import {
  categories,
  categoryOrder,
  getNodesByCategory,
  NodeTypeId,
  CategoryId,
} from '../../config/nodeConfig'
import { ModuleSelector, ModuleSelectorCompact } from '../../../../shared/layouts/ModuleSelector'
import SidebarToggle from '../../../../shared/components/SidebarToggle'
import UserProfile from '../../../../shared/components/UserProfile'
import DraggableNodeItem from './DraggableNodeItem'
import CollapsedCategoryButton from './CollapsedCategoryButton'

const COLLAPSED_STORAGE_KEY = 'rdiagrams-sidebar-collapsed'

const NodePalette = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    // Default to collapsed, unless explicitly set to 'false'
    return stored !== 'false'
  })
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryId>>(
    new Set(['applications', 'data'])
  )

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next))
      return next
    })
  }

  const onDragStart = (event: DragEvent, nodeTypeId: NodeTypeId) => {
    event.dataTransfer.setData('application/reactflow', nodeTypeId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const toggleCategory = (categoryId: CategoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categoryOrder.map((catId) => ({
        category: categories[catId],
        nodes: getNodesByCategory(catId),
      }))
    }

    const query = searchQuery.toLowerCase()
    return categoryOrder
      .map((catId) => ({
        category: categories[catId],
        nodes: getNodesByCategory(catId).filter(
          (node) =>
            node.label.toLowerCase().includes(query) ||
            node.description.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.nodes.length > 0)
  }, [searchQuery])

  return (
    <div
      className={`
        bg-white border-r border-gray-200 flex flex-col h-full
        transition-all duration-300 ease-out
        ${isCollapsed ? 'w-[68px]' : 'w-72'}
      `}
    >
      {/* Header with branding */}
      <div
        className={`
        border-b border-gray-200 flex items-center
        transition-all duration-300
        ${isCollapsed ? 'p-3 justify-center' : 'p-4'}
      `}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center py-1">
            <div className="text-xl font-bold leading-none tracking-tight">
              <span className="text-secondary">R'</span>
              <span className="text-primary">D</span>
            </div>
            <div className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">
              Arch
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">
              <span className="text-secondary">R'</span>
              <span className="text-primary">Diagrams</span>
            </h1>
          </div>
        )}
      </div>

      {/* Module Selector */}
      <div
        className={`
        border-b border-gray-200 transition-all duration-300
        ${isCollapsed ? 'p-2' : 'p-3'}
      `}
      >
        {isCollapsed ? <ModuleSelectorCompact /> : <ModuleSelector />}
      </div>

      {/* Search section */}
      <div
        className={`
        border-b border-gray-100 transition-all duration-300
        ${isCollapsed ? 'p-2' : 'p-3'}
      `}
      >
        {isCollapsed ? (
          <div
            className="
              w-full p-2.5 rounded-xl flex items-center justify-center
              text-gray-300
            "
            title="Expand to search"
          >
            <Search size={18} />
          </div>
        ) : (
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-9 pr-3 py-2 text-sm
                bg-gray-50 border border-gray-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                placeholder:text-gray-400
              "
            />
          </div>
        )}
      </div>

      {/* Node categories */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isCollapsed ? (
          <div className="py-2">
            {categoryOrder.map((catId) => {
              const category = categories[catId]
              const nodes = getNodesByCategory(catId)
              return (
                <CollapsedCategoryButton
                  key={catId}
                  category={category}
                  nodes={nodes}
                  onDragStart={onDragStart}
                />
              )
            })}
          </div>
        ) : (
          filteredCategories.map(({ category, nodes }) => {
            const isExpanded = searchQuery.trim() || expandedCategories.has(category.id)

            return (
              <div key={category.id} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="
                    w-full flex items-center justify-between px-4 py-3
                    hover:bg-gray-50 transition-colors
                  "
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{category.label}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {nodes.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRightIcon size={16} className="text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {nodes.map((node) => (
                      <DraggableNodeItem
                        key={node.id}
                        node={node}
                        category={category}
                        onDragStart={onDragStart}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer with help text */}
      {!isCollapsed && (
        <div className="px-3 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Drag to canvas |{' '}
            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-gray-500">⌫</kbd> to delete
          </p>
        </div>
      )}

      {/* User Profile */}
      <UserProfile isCollapsed={isCollapsed} />

      {/* Collapse/Expand toggle */}
      <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleCollapsed} />
    </div>
  )
}

export default NodePalette

import { memo, useEffect, useRef } from 'react'
import { Node } from 'reactflow'
import { Layers, Ungroup, Trash2, LogOut } from 'lucide-react'
import { BaseNodeData } from '../Nodes/BaseNode'
import { isGroupNode } from '../../utils/groupingUtils'

interface ContextMenuProps {
  x: number
  y: number
  selectedNodes: Node<BaseNodeData>[]
  onClose: () => void
  onGroup: () => void
  onUngroup: (groupId: string) => void
  onDelete: () => void
  onRemoveFromGroup: (nodeId: string) => void
}

const ContextMenu = ({
  x,
  y,
  selectedNodes,
  onClose,
  onGroup,
  onUngroup,
  onDelete,
  onRemoveFromGroup,
}: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Determine available actions
  // Allow grouping if 2+ non-group nodes are selected and all share the same parent (including undefined for root level)
  const canGroup = selectedNodes.length >= 2
    && selectedNodes.every((n) => !isGroupNode(n))
    && new Set(selectedNodes.map((n) => n.parentNode)).size === 1
  const selectedGroup = selectedNodes.length === 1 && isGroupNode(selectedNodes[0]) ? selectedNodes[0] : null
  const selectedChildNode = selectedNodes.length === 1 && selectedNodes[0].parentNode ? selectedNodes[0] : null

  const menuItems = []

  if (canGroup) {
    menuItems.push({
      icon: Layers,
      label: 'Group',
      onClick: () => {
        onGroup()
        onClose()
      },
    })
  }

  if (selectedGroup) {
    menuItems.push({
      icon: Ungroup,
      label: 'Ungroup',
      onClick: () => {
        onUngroup(selectedGroup.id)
        onClose()
      },
    })
  }

  if (selectedChildNode) {
    menuItems.push({
      icon: LogOut,
      label: 'Remove from group',
      onClick: () => {
        onRemoveFromGroup(selectedChildNode.id)
        onClose()
      },
    })
  }

  if (selectedNodes.length > 0) {
    if (menuItems.length > 0) {
      menuItems.push({ type: 'divider' as const })
    }
    menuItems.push({
      icon: Trash2,
      label: 'Delete',
      onClick: () => {
        onDelete()
        onClose()
      },
      danger: true,
    })
  }

  if (menuItems.length === 0) {
    return null
  }

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 180)
  const adjustedY = Math.min(y, window.innerHeight - menuItems.length * 40 - 20)

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] animate-fade-in"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {menuItems.map((item, index) => {
        if ('type' in item && item.type === 'divider') {
          return <div key={index} className="my-1 border-t border-gray-100" />
        }

        const Icon = item.icon
        return (
          <button
            key={index}
            onClick={item.onClick}
            className={`
              w-full flex items-center gap-3 px-4 py-2
              text-sm transition-colors text-left
              ${item.danger
                ? 'text-danger hover:bg-danger/10'
                : 'text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <Icon size={16} className={item.danger ? 'text-danger' : 'text-gray-400'} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export default memo(ContextMenu)

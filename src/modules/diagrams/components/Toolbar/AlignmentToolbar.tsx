import { memo, useMemo } from 'react'
import { Node, useReactFlow, useViewport } from 'reactflow'
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from 'lucide-react'
import {
  alignNodes,
  distributeNodes,
  getSelectionCenter,
  AlignmentType,
  DistributionType,
} from '../../utils/alignmentUtils'
import { BaseNodeData } from '../Nodes/BaseNode'

interface AlignmentToolbarProps {
  selectedNodes: Node<BaseNodeData>[]
}

const AlignmentToolbar = ({ selectedNodes }: AlignmentToolbarProps) => {
  const { getNodes, setNodes } = useReactFlow()
  const { x: viewportX, y: viewportY, zoom } = useViewport()

  const toolbarPosition = useMemo(() => {
    if (selectedNodes.length < 2) return null
    const center = getSelectionCenter(selectedNodes)
    return {
      x: center.x * zoom + viewportX,
      y: center.y * zoom + viewportY,
    }
  }, [selectedNodes, viewportX, viewportY, zoom])

  if (selectedNodes.length < 2 || !toolbarPosition) {
    return null
  }

  const handleAlign = (alignType: AlignmentType) => {
    const allNodes = getNodes()
    const selectedIds = new Set(selectedNodes.map((n) => n.id))
    const alignedNodes = alignNodes(selectedNodes, alignType)
    const alignedMap = new Map(alignedNodes.map((n) => [n.id, n]))

    const updatedNodes = allNodes.map((node) => {
      if (selectedIds.has(node.id)) {
        const aligned = alignedMap.get(node.id)
        return aligned ? { ...node, position: aligned.position } : node
      }
      return node
    })

    setNodes(updatedNodes)
  }

  const handleDistribute = (distribution: DistributionType) => {
    if (selectedNodes.length < 3) return

    const allNodes = getNodes()
    const selectedIds = new Set(selectedNodes.map((n) => n.id))
    const distributedNodes = distributeNodes(selectedNodes, distribution)
    const distributedMap = new Map(distributedNodes.map((n) => [n.id, n]))

    const updatedNodes = allNodes.map((node) => {
      if (selectedIds.has(node.id)) {
        const distributed = distributedMap.get(node.id)
        return distributed ? { ...node, position: distributed.position } : node
      }
      return node
    })

    setNodes(updatedNodes)
  }

  const alignButtons = [
    { type: 'left' as AlignmentType, icon: AlignHorizontalJustifyStart, title: 'Align Left' },
    { type: 'center' as AlignmentType, icon: AlignHorizontalJustifyCenter, title: 'Align Center' },
    { type: 'right' as AlignmentType, icon: AlignHorizontalJustifyEnd, title: 'Align Right' },
  ]

  const alignVerticalButtons = [
    { type: 'top' as AlignmentType, icon: AlignVerticalJustifyStart, title: 'Align Top' },
    { type: 'middle' as AlignmentType, icon: AlignVerticalJustifyCenter, title: 'Align Middle' },
    { type: 'bottom' as AlignmentType, icon: AlignVerticalJustifyEnd, title: 'Align Bottom' },
  ]

  const distributeButtons = [
    { type: 'horizontal' as DistributionType, icon: AlignHorizontalSpaceAround, title: 'Distribute Horizontally' },
    { type: 'vertical' as DistributionType, icon: AlignVerticalSpaceAround, title: 'Distribute Vertically' },
  ]

  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        left: toolbarPosition.x,
        top: toolbarPosition.y,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
        {/* Horizontal alignment */}
        <div className="flex items-center gap-0.5">
          {alignButtons.map(({ type, icon: Icon, title }) => (
            <button
              key={type}
              onClick={() => handleAlign(type)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600 hover:text-gray-900"
              title={title}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Vertical alignment */}
        <div className="flex items-center gap-0.5">
          {alignVerticalButtons.map(({ type, icon: Icon, title }) => (
            <button
              key={type}
              onClick={() => handleAlign(type)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600 hover:text-gray-900"
              title={title}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        {selectedNodes.length >= 3 && (
          <>
            <div className="w-px h-6 bg-gray-200" />

            {/* Distribution */}
            <div className="flex items-center gap-0.5">
              {distributeButtons.map(({ type, icon: Icon, title }) => (
                <button
                  key={type}
                  onClick={() => handleDistribute(type)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600 hover:text-gray-900"
                  title={title}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default memo(AlignmentToolbar)

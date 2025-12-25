import { memo, useCallback } from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from 'reactflow'
import { nodeTypes, categories } from '../../config/nodeConfig'

export interface CustomEdgeData {
  sourceNodeType?: string
  targetNodeType?: string
  colorFromTarget?: boolean
  label?: string
}

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<CustomEdgeData>) => {
  const { setEdges, setNodes } = useReactFlow()

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Get color based on source or target node (controlled by colorFromTarget flag)
  let strokeColor = '#94a3b8' // default gray

  const nodeType = data?.colorFromTarget ? data?.targetNodeType : data?.sourceNodeType

  if (nodeType) {
    const nodeConfig = nodeTypes[nodeType as keyof typeof nodeTypes]
    if (nodeConfig) {
      const category = categories[nodeConfig.category]
      strokeColor = category.color
    }
  }

  // Handle click on the color dot to select the edge
  const handleDotClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    // Deselect all nodes first
    setNodes((nodes) => nodes.map((node) => ({ ...node, selected: false })))
    // Select this edge, deselect others
    setEdges((edges) => edges.map((edge) => ({ ...edge, selected: edge.id === id })))
  }, [id, setEdges, setNodes])

  return (
    <>
      {/* Glow effect on hover/selected */}
      <path
        id={`${id}-glow`}
        className="react-flow__edge-path-glow"
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={selected ? 8 : 0}
        strokeOpacity={0.2}
        style={{
          transition: 'stroke-width 0.15s ease',
        }}
      />
      {/* Main edge path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={selected ? 2.5 : 2}
        style={{
          transition: 'stroke-width 0.15s ease, stroke 0.15s ease',
          filter: selected ? `drop-shadow(0 0 3px ${strokeColor}40)` : 'none',
        }}
      />
      {/* Color indicator dot and label at the center of the edge */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          className="nodrag nopan"
          onClick={handleDotClick}
        >
          <div
            style={{
              width: selected ? 14 : 10,
              height: selected ? 14 : 10,
              backgroundColor: strokeColor,
              border: '2px solid white',
              borderRadius: '50%',
              boxShadow: selected ? `0 0 0 3px ${strokeColor}30, 0 1px 3px rgba(0,0,0,0.2)` : '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          />
          {data?.label && (
            <div
              style={{
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '11px',
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: `1px solid ${strokeColor}40`,
                whiteSpace: 'nowrap',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {data.label}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(CustomEdge)

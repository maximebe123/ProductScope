import { useCallback, useState } from 'react'
import { CanvasItem } from '../types/canvas'

/**
 * Generic selection hook for tracking selected canvas items
 *
 * Handles the common pattern where:
 * - Only one node can be selected for property editing
 * - Only one edge can be selected at a time
 * - Selecting an edge deselects nodes and vice versa
 *
 * @example
 * ```tsx
 * const {
 *   selectedNode,
 *   selectedEdge,
 *   onSelectionChange,
 *   selectAll,
 *   deselectAll
 * } = useSelection<MyNode, MyEdge>()
 *
 * // Pass to ReactFlow
 * <ReactFlow onSelectionChange={onSelectionChange} />
 *
 * // Show properties panel
 * {selectedNode && <NodeProperties node={selectedNode} />}
 * ```
 */
export function useSelection<
  TNode extends CanvasItem,
  TEdge extends { id: string }
>() {
  const [selectedNode, setSelectedNode] = useState<TNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<TEdge | null>(null)

  /**
   * Handle selection change from ReactFlow
   * Implements single-selection behavior for property panels
   */
  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: TNode[]; edges: TEdge[] }) => {
      if (nodes.length === 1) {
        // Single node selected
        setSelectedNode(nodes[0])
        setSelectedEdge(null)
      } else if (edges.length === 1 && nodes.length === 0) {
        // Single edge selected (no nodes)
        setSelectedEdge(edges[0])
        setSelectedNode(null)
      } else {
        // Multiple selection or nothing - clear property panels
        setSelectedNode(null)
        setSelectedEdge(null)
      }
    },
    []
  )

  /**
   * Clear all selections
   * Call this after operations that modify selected items
   */
  const clearSelection = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
  }, [])

  /**
   * Update selected node data after property changes
   * Keeps the property panel in sync with node changes
   */
  const updateSelectedNodeData = useCallback(
    (nodeId: string, updater: (node: TNode) => TNode) => {
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => (prev ? updater(prev) : null))
      }
    },
    [selectedNode]
  )

  /**
   * Update selected edge data after property changes
   */
  const updateSelectedEdgeData = useCallback(
    (edgeId: string, updater: (edge: TEdge) => TEdge) => {
      if (selectedEdge?.id === edgeId) {
        setSelectedEdge((prev) => (prev ? updater(prev) : null))
      }
    },
    [selectedEdge]
  )

  return {
    selectedNode,
    selectedEdge,
    setSelectedNode,
    setSelectedEdge,
    onSelectionChange,
    clearSelection,
    updateSelectedNodeData,
    updateSelectedEdgeData,
  }
}

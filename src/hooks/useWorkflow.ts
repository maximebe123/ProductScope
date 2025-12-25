import { useCallback } from 'react'
import {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  OnConnect,
} from 'reactflow'
import { BaseNodeData } from '../components/Nodes'

// Import core hooks
import { useHistory } from '../core/hooks/useHistory'
import { useClipboard } from '../core/hooks/useClipboard'
import { useSelection } from '../core/hooks/useSelection'

// Import specialized operation hooks
import { useNodeOperations, getNodeId, setNodeIdCounter } from './useNodeOperations'
import { useGroupOperations } from './useGroupOperations'
import { useAIMerge } from './useAIMerge'

/**
 * Main workflow hook for diagram state management
 * Composes core hooks and specialized operation hooks
 */
export const useWorkflow = () => {
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<BaseNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Core hooks composition
  const { pushToHistory, undo, redo, canUndo, canRedo } = useHistory(
    nodes,
    edges,
    setNodes,
    setEdges
  )

  const { hasClipboard, copyItems, getItemsForPaste, duplicateItems } =
    useClipboard<Node<BaseNodeData>>(getNodeId)

  const {
    selectedNode,
    selectedEdge,
    onSelectionChange,
    clearSelection,
    updateSelectedNodeData,
    updateSelectedEdgeData,
  } = useSelection<Node<BaseNodeData>, Edge>()

  // Specialized operation hooks
  const nodeOps = useNodeOperations({
    setNodes,
    setEdges,
    pushToHistory,
    clearSelection,
    selectedNode,
    updateSelectedNodeData,
    updateSelectedEdgeData,
  })

  const groupOps = useGroupOperations({
    nodes,
    setNodes,
    setEdges,
    pushToHistory,
    clearSelection,
  })

  const aiOps = useAIMerge({
    setNodes,
    setEdges,
    pushToHistory,
    clearSelection,
  })

  // ============================================
  // Connection Operations
  // ============================================

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      pushToHistory()
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'custom',
          },
          eds
        )
      )
    },
    [setEdges, pushToHistory]
  )

  // ============================================
  // Load/Save Operations
  // ============================================

  const loadDiagram = useCallback(
    (newNodes: Node<BaseNodeData>[], newEdges: Edge[]) => {
      setNodes(newNodes)
      setEdges(newEdges)
      clearSelection()

      // Update nodeId counter to avoid conflicts
      const maxNodeId = newNodes.reduce((max, node) => {
        const match = node.id.match(/node_(\d+)/)
        if (match) {
          return Math.max(max, parseInt(match[1], 10))
        }
        return max
      }, 0)
      setNodeIdCounter(maxNodeId + 1)
    },
    [setNodes, setEdges, clearSelection]
  )

  // ============================================
  // Clipboard Operations (using core hook)
  // ============================================

  const copySelectedNodes = useCallback(() => {
    const selected = nodes.filter((n) => n.selected)
    copyItems(selected)
  }, [nodes, copyItems])

  const pasteNodes = useCallback(() => {
    if (!hasClipboard) return
    pushToHistory()

    const newNodes = getItemsForPaste()
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ])
    clearSelection()
  }, [hasClipboard, pushToHistory, getItemsForPaste, setNodes, clearSelection])

  const duplicateSelectedNodes = useCallback(() => {
    const selected = nodes.filter((n) => n.selected)
    if (selected.length === 0) return
    pushToHistory()

    const newNodes = duplicateItems(selected)
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ])
    clearSelection()
  }, [nodes, pushToHistory, duplicateItems, setNodes, clearSelection])

  // ============================================
  // Selection Operations
  // ============================================

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })))
    clearSelection()
  }, [setNodes, clearSelection])

  const deselectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })))
    clearSelection()
  }, [setNodes, setEdges, clearSelection])

  const moveSelectedNodes = useCallback(
    (dx: number, dy: number) => {
      const selected = nodes.filter((n) => n.selected)
      if (selected.length === 0) return
      pushToHistory()

      setNodes((nds) =>
        nds.map((n) =>
          n.selected
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n
        )
      )
    },
    [nodes, setNodes, pushToHistory]
  )

  // ============================================
  // Return API
  // ============================================

  return {
    // State
    nodes,
    edges,
    selectedNode,
    selectedEdge,

    // ReactFlow handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,

    // Node operations (from useNodeOperations)
    addNode: nodeOps.addNode,
    updateNodeLabel: nodeOps.updateNodeLabel,
    addNodeTag: nodeOps.addNodeTag,
    removeNodeTag: nodeOps.removeNodeTag,
    addVolume: nodeOps.addVolume,
    removeVolume: nodeOps.removeVolume,
    deleteNode: nodeOps.deleteNode,
    deleteSelected: nodeOps.deleteSelected,

    // Edge operations (from useNodeOperations)
    toggleEdgeColorMode: nodeOps.toggleEdgeColorMode,
    updateEdgeLabel: nodeOps.updateEdgeLabel,

    // Load/save
    loadDiagram,

    // Group operations (from useGroupOperations)
    createGroup: groupOps.createGroup,
    ungroup: groupOps.ungroup,
    addNodeToGroup: groupOps.addNodeToGroup,
    removeFromGroup: groupOps.removeFromGroup,
    deleteGroup: groupOps.deleteGroup,
    getGroups: groupOps.getGroups,

    // History operations
    undo,
    redo,
    canUndo,
    canRedo,

    // Clipboard operations
    copySelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,

    // Selection operations
    selectAll,
    deselectAll,
    moveSelectedNodes,
    hasClipboard,

    // AI operations (from useAIMerge)
    mergeDiagramChanges: aiOps.mergeDiagramChanges,
  }
}

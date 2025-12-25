import { useCallback } from 'react'
import { Node, Edge } from 'reactflow'
import { NodeTypeId, nodeTypes } from '../modules/diagrams/config/nodeConfig'
import { BaseNodeData, VolumeAttachment } from '../components/Nodes'
import { isGroupNode, getAllDescendants } from '../modules/diagrams/utils/groupingUtils'

// Node ID generator
let nodeId = 0
export const getNodeId = () => `node_${nodeId++}`
export const setNodeIdCounter = (value: number) => {
  nodeId = value
}

interface UseNodeOperationsProps {
  setNodes: React.Dispatch<React.SetStateAction<Node<BaseNodeData>[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  pushToHistory: () => void
  clearSelection: () => void
  selectedNode: Node<BaseNodeData> | null
  updateSelectedNodeData: (
    nodeId: string,
    updater: (node: Node<BaseNodeData>) => Node<BaseNodeData>
  ) => void
  updateSelectedEdgeData: (
    edgeId: string,
    updater: (edge: Edge) => Edge
  ) => void
}

/**
 * Hook for node CRUD operations
 */
export const useNodeOperations = ({
  setNodes,
  setEdges,
  pushToHistory,
  clearSelection,
  selectedNode,
  updateSelectedNodeData,
  updateSelectedEdgeData,
}: UseNodeOperationsProps) => {
  // ============================================
  // Node CRUD Operations
  // ============================================

  const addNode = useCallback(
    (nodeTypeId: NodeTypeId, position: { x: number; y: number }) => {
      pushToHistory()
      const config = nodeTypes[nodeTypeId]
      const newNode: Node<BaseNodeData> = {
        id: getNodeId(),
        type: 'customNode',
        position,
        data: {
          label: config.defaultLabel,
          nodeType: nodeTypeId,
        },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, pushToHistory]
  )

  const updateNodeLabel = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, label: newLabel } }
            : node
        )
      )
      updateSelectedNodeData(nodeId, (node) => ({
        ...node,
        data: { ...node.data, label: newLabel },
      }))
    },
    [setNodes, updateSelectedNodeData]
  )

  const addNodeTag = useCallback(
    (nodeId: string, tag: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  tags: [...(node.data.tags || []), tag],
                },
              }
            : node
        )
      )
      updateSelectedNodeData(nodeId, (node) => ({
        ...node,
        data: {
          ...node.data,
          tags: [...(node.data.tags || []), tag],
        },
      }))
    },
    [setNodes, updateSelectedNodeData]
  )

  const removeNodeTag = useCallback(
    (nodeId: string, tagIndex: number) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  tags: (node.data.tags || []).filter((_, i) => i !== tagIndex),
                },
              }
            : node
        )
      )
      updateSelectedNodeData(nodeId, (node) => ({
        ...node,
        data: {
          ...node.data,
          tags: (node.data.tags || []).filter((_, i) => i !== tagIndex),
        },
      }))
    },
    [setNodes, updateSelectedNodeData]
  )

  const addVolume = useCallback(
    (nodeId: string, volume: VolumeAttachment) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  volumes: [...(node.data.volumes || []), volume],
                },
              }
            : node
        )
      )
      updateSelectedNodeData(nodeId, (node) => ({
        ...node,
        data: {
          ...node.data,
          volumes: [...(node.data.volumes || []), volume],
        },
      }))
    },
    [setNodes, updateSelectedNodeData]
  )

  const removeVolume = useCallback(
    (nodeId: string, volumeIndex: number) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  volumes: (node.data.volumes || []).filter((_, i) => i !== volumeIndex),
                },
              }
            : node
        )
      )
      updateSelectedNodeData(nodeId, (node) => ({
        ...node,
        data: {
          ...node.data,
          volumes: (node.data.volumes || []).filter((_, i) => i !== volumeIndex),
        },
      }))
    },
    [setNodes, updateSelectedNodeData]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      pushToHistory()
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId)
        if (!node) return nds

        // If it's a group, also delete all descendants
        const idsToDelete = new Set([nodeId])
        if (isGroupNode(node)) {
          getAllDescendants(nodeId, nds).forEach((d) => idsToDelete.add(d.id))
        }

        setEdges((eds) =>
          eds.filter(
            (edge) => !idsToDelete.has(edge.source) && !idsToDelete.has(edge.target)
          )
        )
        return nds.filter((n) => !idsToDelete.has(n.id))
      })
      if (selectedNode?.id === nodeId) {
        clearSelection()
      }
    },
    [setNodes, setEdges, selectedNode, pushToHistory, clearSelection]
  )

  const deleteSelected = useCallback(() => {
    pushToHistory()
    setNodes((nds) => {
      const selectedNodes = nds.filter((node) => node.selected)

      // Collect all IDs to delete (selected nodes + their descendants if they're groups)
      const idsToDelete = new Set<string>()
      selectedNodes.forEach((node) => {
        idsToDelete.add(node.id)
        if (isGroupNode(node)) {
          getAllDescendants(node.id, nds).forEach((d) => idsToDelete.add(d.id))
        }
      })

      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !idsToDelete.has(edge.source) && !idsToDelete.has(edge.target) && !edge.selected
        )
      )
      return nds.filter((n) => !idsToDelete.has(n.id))
    })
    clearSelection()
  }, [setNodes, setEdges, pushToHistory, clearSelection])

  // ============================================
  // Edge Operations
  // ============================================

  const toggleEdgeColorMode = useCallback(
    (edgeId: string) => {
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  colorFromTarget: !edge.data?.colorFromTarget,
                },
              }
            : edge
        )
      )
      updateSelectedEdgeData(edgeId, (edge) => ({
        ...edge,
        data: {
          ...edge.data,
          colorFromTarget: !edge.data?.colorFromTarget,
        },
      }))
    },
    [setEdges, updateSelectedEdgeData]
  )

  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  label,
                },
              }
            : edge
        )
      )
      updateSelectedEdgeData(edgeId, (edge) => ({
        ...edge,
        data: {
          ...edge.data,
          label,
        },
      }))
    },
    [setEdges, updateSelectedEdgeData]
  )

  return {
    addNode,
    updateNodeLabel,
    addNodeTag,
    removeNodeTag,
    addVolume,
    removeVolume,
    deleteNode,
    deleteSelected,
    toggleEdgeColorMode,
    updateEdgeLabel,
  }
}

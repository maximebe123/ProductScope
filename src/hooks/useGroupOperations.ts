import { useCallback } from 'react'
import { Node, Edge } from 'reactflow'
import { BaseNodeData } from '../components/Nodes'
import { GroupNodeData } from '../modules/diagrams/components/Nodes/GroupNode'
import {
  createGroupFromNodes,
  ungroupNodes,
  assignNodeToGroup,
  removeNodeFromGroup,
  getGroupChildren,
  getAllDescendants,
  isGroupNode,
  getNodeDepth,
} from '../modules/diagrams/utils/groupingUtils'

// Group ID generator
let groupId = 0
export const getGroupId = () => `group_${groupId++}`

interface UseGroupOperationsProps {
  nodes: Node<BaseNodeData>[]
  setNodes: React.Dispatch<React.SetStateAction<Node<BaseNodeData>[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  pushToHistory: () => void
  clearSelection: () => void
}

/**
 * Hook for group operations (create, ungroup, add/remove from group)
 */
export const useGroupOperations = ({
  nodes,
  setNodes,
  setEdges,
  pushToHistory,
  clearSelection,
}: UseGroupOperationsProps) => {
  const createGroup = useCallback(
    (selectedNodeIds: string[], label: string = 'New Group') => {
      pushToHistory()
      setNodes((nds) => {
        const selectedNodes = nds.filter((n) => selectedNodeIds.includes(n.id))
        if (selectedNodes.length < 2) return nds

        // Find the common parent (if all selected nodes share the same parent)
        const parents = new Set(selectedNodes.map((n) => n.parentNode))
        const commonParent = parents.size === 1 ? [...parents][0] : undefined

        // Filter nodes: only group nodes that share the same parent level
        const validNodes = selectedNodes.filter((n) => n.parentNode === commonParent)
        if (validNodes.length < 2) return nds

        const newGroupId = getGroupId()
        const { groupNode, updatedChildren } = createGroupFromNodes(
          validNodes,
          newGroupId,
          label
        )

        // If nodes have a common parent, the new group also needs to be a child of that parent
        let finalGroupNode = groupNode as Node<BaseNodeData>
        if (commonParent) {
          const parentNode = nds.find((n) => n.id === commonParent)
          const parentDepth = parentNode ? getNodeDepth(parentNode, nds) : 0
          const newDepth = parentDepth + 1

          finalGroupNode = {
            ...finalGroupNode,
            parentNode: commonParent,
            expandParent: true,
            zIndex: newDepth * 10,
          }
        }

        // Update children with appropriate z-index
        const groupDepth = commonParent ? (finalGroupNode.zIndex || 0) / 10 : 0
        const updatedChildrenWithZIndex = updatedChildren.map((child) => ({
          ...child,
          zIndex: (groupDepth + 1) * 10,
        }))

        // Update nodes: add group node, update children positions
        const childIds = new Set(validNodes.map((n) => n.id))
        const otherNodes = nds.filter((n) => !childIds.has(n.id))

        // Group node must come before children in the array for React Flow
        return [finalGroupNode, ...otherNodes, ...updatedChildrenWithZIndex]
      })
      clearSelection()
    },
    [setNodes, pushToHistory, clearSelection]
  )

  const ungroup = useCallback(
    (groupNodeId: string) => {
      pushToHistory()
      setNodes((nds) => {
        const groupNode = nds.find((n) => n.id === groupNodeId && isGroupNode(n))
        if (!groupNode) return nds

        const children = getGroupChildren(groupNodeId, nds)
        const ungroupedChildren = ungroupNodes(
          groupNode as Node<GroupNodeData>,
          children
        )

        const childIds = new Set(children.map((n) => n.id))
        const otherNodes = nds.filter(
          (n) => n.id !== groupNodeId && !childIds.has(n.id)
        )

        return [...otherNodes, ...ungroupedChildren]
      })
      clearSelection()
    },
    [setNodes, pushToHistory, clearSelection]
  )

  const addNodeToGroup = useCallback(
    (nodeId: string, groupNodeId: string) => {
      pushToHistory()
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId)
        const groupNode = nds.find((n) => n.id === groupNodeId && isGroupNode(n))
        if (!node || !groupNode || node.parentNode) return nds

        const updatedNode = assignNodeToGroup(node, groupNode as Node<GroupNodeData>)

        return nds.map((n) => (n.id === nodeId ? updatedNode : n))
      })
    },
    [setNodes, pushToHistory]
  )

  const removeFromGroup = useCallback(
    (nodeId: string) => {
      pushToHistory()
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId)
        if (!node || !node.parentNode) return nds

        const groupNode = nds.find((n) => n.id === node.parentNode)
        if (!groupNode) return nds

        const updatedNode = removeNodeFromGroup(node, groupNode as Node<GroupNodeData>)

        return nds.map((n) => (n.id === nodeId ? updatedNode : n))
      })
    },
    [setNodes, pushToHistory]
  )

  const deleteGroup = useCallback(
    (groupNodeId: string, deleteChildren: boolean = false) => {
      pushToHistory()
      setNodes((nds) => {
        const groupNode = nds.find((n) => n.id === groupNodeId && isGroupNode(n))
        if (!groupNode) return nds

        const children = getGroupChildren(groupNodeId, nds)

        if (deleteChildren) {
          const allDescendants = getAllDescendants(groupNodeId, nds)
          const idsToDelete = new Set([groupNodeId, ...allDescendants.map((c) => c.id)])
          setEdges((eds) =>
            eds.filter(
              (e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
            )
          )
          return nds.filter((n) => !idsToDelete.has(n.id))
        } else {
          const ungroupedChildren = ungroupNodes(
            groupNode as Node<GroupNodeData>,
            children
          )
          const childIds = new Set(children.map((n) => n.id))
          const otherNodes = nds.filter(
            (n) => n.id !== groupNodeId && !childIds.has(n.id)
          )
          return [...otherNodes, ...ungroupedChildren]
        }
      })
      clearSelection()
    },
    [setNodes, setEdges, pushToHistory, clearSelection]
  )

  const getGroups = useCallback(() => {
    return nodes.filter(isGroupNode) as Node<GroupNodeData>[]
  }, [nodes])

  return {
    createGroup,
    ungroup,
    addNodeToGroup,
    removeFromGroup,
    deleteGroup,
    getGroups,
  }
}

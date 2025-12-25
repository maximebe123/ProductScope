import { useCallback } from 'react'
import { Node, Edge } from 'reactflow'
import { BaseNodeData } from '../components/Nodes'
import { createGroupFromNodes } from '../modules/diagrams/utils/groupingUtils'
import type {
  OperationResponse,
  MergeData,
  PositionedNode,
  PositionedEdge,
  GroupCreation,
} from '../types/ai'
import { getNodeId, setNodeIdCounter } from './useNodeOperations'

interface UseAIMergeProps {
  setNodes: React.Dispatch<React.SetStateAction<Node<BaseNodeData>[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  pushToHistory: () => void
  clearSelection: () => void
}

/**
 * Hook for AI-powered diagram merge operations
 */
export const useAIMerge = ({
  setNodes,
  setEdges,
  pushToHistory,
  clearSelection,
}: UseAIMergeProps) => {
  const mergeDiagramChanges = useCallback(
    (changes: OperationResponse | MergeData) => {
      pushToHistory()

      const convertNode = (node: PositionedNode): Node<BaseNodeData> => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: node.data.label,
          nodeType: node.data.nodeType as BaseNodeData['nodeType'],
          tags: node.data.tags || [],
          volumes: node.data.volumes || [],
          isGroup: node.data.isGroup || false,
        },
        ...(node.parentNode && {
          parentNode: node.parentNode,
          extent: node.extent as 'parent' | undefined,
          expandParent: node.expandParent,
        }),
        ...(node.style && { style: node.style }),
      })

      const convertEdge = (edge: PositionedEdge): Edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
        data: edge.data || undefined,
      })

      // 1. Delete nodes
      if (changes.nodes_to_delete?.length) {
        const nodesToDeleteSet = new Set(changes.nodes_to_delete)
        setNodes((nds) => nds.filter((n) => !nodesToDeleteSet.has(n.id)))
        setEdges((eds) =>
          eds.filter(
            (e) => !nodesToDeleteSet.has(e.source) && !nodesToDeleteSet.has(e.target)
          )
        )
      }

      // 2. Delete edges
      if (changes.edges_to_delete?.length) {
        const edgesToDeleteSet = new Set(changes.edges_to_delete)
        setEdges((eds) => eds.filter((e) => !edgesToDeleteSet.has(e.id)))
      }

      // 3. Modify existing nodes
      const nodesToModify = changes.nodes_to_modify
      if (nodesToModify?.length) {
        setNodes((nds) =>
          nds.map((node) => {
            const mod = nodesToModify.find((m) => m.node_id === node.id)
            if (!mod) return node

            const newData = { ...node.data }

            if (mod.new_label != null) {
              newData.label = mod.new_label
            }

            if (mod.new_tags != null) {
              newData.tags = mod.new_tags
            } else {
              let tags = [...(newData.tags || [])]
              if (mod.add_tags?.length) {
                tags = [...tags, ...mod.add_tags]
              }
              if (mod.remove_tags?.length) {
                const toRemove = new Set(mod.remove_tags)
                tags = tags.filter((t) => !toRemove.has(t))
              }
              newData.tags = tags
            }

            if (mod.add_volumes?.length) {
              newData.volumes = [...(newData.volumes || []), ...mod.add_volumes]
            }

            let updatedNode = { ...node, data: newData }
            if (mod.new_parent_group != null) {
              updatedNode = {
                ...updatedNode,
                parentNode: mod.new_parent_group || undefined,
                extent: mod.new_parent_group ? ('parent' as const) : undefined,
              }
            }

            return updatedNode
          })
        )
      }

      // 4. Modify existing edges
      const edgesToModify = changes.edges_to_modify
      if (edgesToModify?.length) {
        setEdges((eds) =>
          eds.map((edge) => {
            const mod = edgesToModify.find((m) => m.edge_id === edge.id)
            if (!mod) return edge

            return {
              ...edge,
              ...(mod.new_source != null && { source: mod.new_source }),
              ...(mod.new_target != null && { target: mod.new_target }),
              ...(mod.new_label != null && {
                data: { ...edge.data, label: mod.new_label },
              }),
            }
          })
        )
      }

      // 5. Add new nodes
      if (changes.nodes_to_add?.length) {
        const newNodes = changes.nodes_to_add.map(convertNode)
        setNodes((nds) => [...nds, ...newNodes])

        // Update node ID counter
        let currentId = 0
        // Get current max from getNodeId by parsing the last generated ID
        const tempId = getNodeId()
        const match = tempId.match(/node_(\d+)/)
        if (match) {
          currentId = parseInt(match[1], 10)
        }

        const maxId = newNodes.reduce((max, node) => {
          const nodeMatch = node.id.match(/node_(\d+)/)
          if (nodeMatch) {
            return Math.max(max, parseInt(nodeMatch[1], 10))
          }
          return max
        }, currentId)
        setNodeIdCounter(maxId + 1)
      }

      // 6. Add new edges
      if (changes.edges_to_add?.length) {
        const newEdges = changes.edges_to_add.map(convertEdge)
        setEdges((eds) => [...eds, ...newEdges])
      }

      // 7. Create groups
      if (changes.groups_to_create?.length) {
        changes.groups_to_create.forEach((group: GroupCreation) => {
          setNodes((nds) => {
            const nodesToGroup = nds.filter((n) => group.node_ids.includes(n.id))
            if (nodesToGroup.length < 1) return nds

            const { groupNode, updatedChildren } = createGroupFromNodes(
              nodesToGroup,
              group.group_id,
              group.group_label
            )

            const groupWithTags = {
              ...groupNode,
              data: {
                ...groupNode.data,
                tags: group.group_tags,
              },
            } as Node<BaseNodeData>

            const childIds = new Set(nodesToGroup.map((n) => n.id))
            const otherNodes = nds.filter((n) => !childIds.has(n.id))

            return [groupWithTags, ...otherNodes, ...updatedChildren]
          })
        })
      }

      clearSelection()
    },
    [setNodes, setEdges, pushToHistory, clearSelection]
  )

  return {
    mergeDiagramChanges,
  }
}

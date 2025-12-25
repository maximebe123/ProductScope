/**
 * Data Converters between ReactFlow format and MindElixir format
 * Used for AI integration and data migration
 */

import type { MindElixirData, NodeObj } from 'mind-elixir'
import type { MindMapNode, MindMapEdge, MindMapNodeData } from '../types/mindmap'
import type { MindMapNodeTypeId } from '../config/nodeConfig'
import { NOTE_STYLE } from '../types/mindElixir'

/**
 * Generate a unique ID for nodes
 */
let idCounter = 1
export function generateId(): string {
  return `me-${Date.now()}-${idCounter++}`
}

/**
 * Convert MindElixir data to flat ReactFlow format
 * Used for AI integration (AI expects nodes[] and edges[])
 */
export function convertMindElixirToFlat(data: MindElixirData): {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
} {
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []

  function traverse(node: NodeObj, parentId?: string, depth = 0) {
    // Determine node type based on depth and style
    let nodeType: MindMapNodeTypeId = 'branch'
    if (!parentId) {
      nodeType = 'topic'
    } else if (NOTE_STYLE && node.style?.background === NOTE_STYLE.background) {
      nodeType = 'note'
    }

    const nodeData: MindMapNodeData = {
      label: node.topic,
      nodeType,
    }

    nodes.push({
      id: node.id,
      type: nodeType === 'note' ? 'noteNode' : 'mindMapNode',
      position: { x: 0, y: 0 }, // MindElixir handles positions internally
      data: nodeData,
    })

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
      })
    }

    // Recursively process children
    node.children?.forEach((child) => traverse(child, node.id, depth + 1))
  }

  if (data.nodeData) {
    traverse(data.nodeData)
  }

  return { nodes, edges }
}

/**
 * Convert flat ReactFlow format to MindElixir data
 * Used for loading AI-generated data or migrating from old format
 */
export function convertFlatToMindElixir(
  nodes: MindMapNode[],
  edges: MindMapEdge[]
): MindElixirData {
  // Find the topic (root node)
  const topicNode = nodes.find((n) => n.data.nodeType === 'topic')

  if (!topicNode) {
    // Return default data if no topic found
    return {
      nodeData: {
        id: generateId(),
        topic: 'Central Topic',
        children: [],
      },
    }
  }

  // Build children map from edges
  const childrenMap = new Map<string, string[]>()
  edges.forEach((edge) => {
    const children = childrenMap.get(edge.source) || []
    children.push(edge.target)
    childrenMap.set(edge.source, children)
  })

  // Build tree recursively
  function buildTree(nodeId: string): NodeObj {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) {
      return {
        id: nodeId,
        topic: 'Unknown',
        children: [],
      }
    }

    const childIds = childrenMap.get(nodeId) || []
    const isNote = node.data.nodeType === 'note'

    const nodeObj: NodeObj = {
      id: node.id,
      topic: node.data.label,
      children: childIds.map(buildTree),
    }

    // Apply note style if it's a note
    if (isNote) {
      nodeObj.style = NOTE_STYLE
    }

    return nodeObj
  }

  return {
    nodeData: buildTree(topicNode.id),
  }
}

/**
 * Merge AI changes into existing MindElixir data
 * Handles add, modify, and delete operations
 */
export function mergeChangesIntoMindElixir(
  currentData: MindElixirData,
  changes: {
    nodes_to_add?: Array<{ id: string; parentId: string; label: string; nodeType: string }>
    nodes_to_modify?: Array<{ id: string; label?: string }>
    nodes_to_delete?: string[]
  }
): MindElixirData {
  // Deep clone current data
  const newData: MindElixirData = JSON.parse(JSON.stringify(currentData))

  // Helper to find a node by ID in the tree
  function findNode(root: NodeObj, id: string): NodeObj | null {
    if (root.id === id) return root
    for (const child of root.children || []) {
      const found = findNode(child, id)
      if (found) return found
    }
    return null
  }

  // Delete nodes
  const nodesToDelete = changes.nodes_to_delete
  if (nodesToDelete && nodesToDelete.length > 0) {
    const deleteIds = nodesToDelete // Create local const for closure
    function removeNodes(node: NodeObj): NodeObj {
      return {
        ...node,
        children: node.children
          ?.filter((child) => !deleteIds.includes(child.id))
          .map(removeNodes),
      }
    }
    newData.nodeData = removeNodes(newData.nodeData)
  }

  // Modify nodes
  const nodesToModify = changes.nodes_to_modify
  if (nodesToModify && nodesToModify.length > 0) {
    const modifications = nodesToModify // Create local const for closure
    function modifyNodes(node: NodeObj): NodeObj {
      const mod = modifications.find((m) => m.id === node.id)
      return {
        ...node,
        topic: mod?.label ?? node.topic,
        children: node.children?.map(modifyNodes),
      }
    }
    newData.nodeData = modifyNodes(newData.nodeData)
  }

  // Add nodes
  if (changes.nodes_to_add?.length) {
    for (const nodeToAdd of changes.nodes_to_add) {
      const parent = findNode(newData.nodeData, nodeToAdd.parentId)
      if (parent) {
        const newNode: NodeObj = {
          id: nodeToAdd.id || generateId(),
          topic: nodeToAdd.label,
          children: [],
        }

        // Apply note style if it's a note
        if (nodeToAdd.nodeType === 'note') {
          newNode.style = NOTE_STYLE
        }

        parent.children = parent.children || []
        parent.children.push(newNode)
      }
    }
  }

  return newData
}

/**
 * Create new MindElixir data with a central topic
 */
export function createNewMindMap(topicLabel = 'Central Topic'): MindElixirData {
  return {
    nodeData: {
      id: generateId(),
      topic: topicLabel,
      children: [],
    },
  }
}

/**
 * Detect if data is in old ReactFlow format
 */
export function isReactFlowFormat(data: unknown): data is { nodes: MindMapNode[]; edges: MindMapEdge[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'nodes' in data &&
    Array.isArray((data as { nodes: unknown }).nodes)
  )
}

/**
 * Detect if data is in MindElixir format
 */
export function isMindElixirFormat(data: unknown): data is MindElixirData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'nodeData' in data &&
    typeof (data as { nodeData: unknown }).nodeData === 'object'
  )
}

/**
 * Auto-migrate data from old format if needed
 */
export function migrateData(data: unknown): MindElixirData | null {
  if (isMindElixirFormat(data)) {
    return data
  }

  if (isReactFlowFormat(data)) {
    return convertFlatToMindElixir(data.nodes, data.edges)
  }

  return null
}

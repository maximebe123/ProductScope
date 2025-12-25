import { Node, Edge } from 'reactflow'
import { BaseNodeData } from '../components/Nodes/BaseNode'
import { DiagramExport } from '../../../core/utils/exportUtils'
import { NodeTypeId } from '../config/nodeConfig'

export interface ImportResult {
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
  name: string
}

export interface ImportValidationError {
  field: string
  message: string
}

export function validateImport(data: unknown): ImportValidationError[] {
  const errors: ImportValidationError[] = []

  if (!data || typeof data !== 'object') {
    errors.push({ field: 'root', message: 'Invalid JSON structure' })
    return errors
  }

  const obj = data as Record<string, unknown>

  if (!obj.version || typeof obj.version !== 'string') {
    errors.push({ field: 'version', message: 'Missing or invalid version field' })
  }

  if (!Array.isArray(obj.nodes)) {
    errors.push({ field: 'nodes', message: 'Missing or invalid nodes array' })
  } else {
    obj.nodes.forEach((node: unknown, index: number) => {
      if (!node || typeof node !== 'object') {
        errors.push({ field: `nodes[${index}]`, message: 'Invalid node structure' })
        return
      }
      const n = node as Record<string, unknown>
      if (!n.id) errors.push({ field: `nodes[${index}].id`, message: 'Missing node id' })
      if (!n.position || typeof n.position !== 'object') {
        errors.push({ field: `nodes[${index}].position`, message: 'Missing or invalid position' })
      }
      if (!n.data || typeof n.data !== 'object') {
        errors.push({ field: `nodes[${index}].data`, message: 'Missing or invalid data' })
      } else {
        const data = n.data as Record<string, unknown>
        if (!data.label) errors.push({ field: `nodes[${index}].data.label`, message: 'Missing label' })
        // nodeType is optional for group nodes
        if (!data.nodeType && !data.isGroup) {
          errors.push({ field: `nodes[${index}].data.nodeType`, message: 'Missing nodeType' })
        }
      }
    })
  }

  if (!Array.isArray(obj.edges)) {
    errors.push({ field: 'edges', message: 'Missing or invalid edges array' })
  } else {
    obj.edges.forEach((edge: unknown, index: number) => {
      if (!edge || typeof edge !== 'object') {
        errors.push({ field: `edges[${index}]`, message: 'Invalid edge structure' })
        return
      }
      const e = edge as Record<string, unknown>
      if (!e.id) errors.push({ field: `edges[${index}].id`, message: 'Missing edge id' })
      if (!e.source) errors.push({ field: `edges[${index}].source`, message: 'Missing source' })
      if (!e.target) errors.push({ field: `edges[${index}].target`, message: 'Missing target' })
    })
  }

  return errors
}

export function parseImport(data: DiagramExport): ImportResult {
  const nodes: Node<BaseNodeData>[] = data.nodes.map((node) => {
    const baseNode: Node<BaseNodeData> = {
      id: node.id,
      type: node.type || 'customNode',
      position: node.position,
      data: {
        label: node.data.label,
        nodeType: node.data.nodeType as NodeTypeId,
        tags: node.data.tags || [],
        isGroup: node.data.isGroup,
        volumes: node.data.volumes || [],
      },
    }

    // Restore style for group nodes
    if (node.style) {
      baseNode.style = {
        width: node.style.width,
        height: node.style.height,
      }
    }

    // Restore parent-child relationship
    if (node.parentNode) {
      baseNode.parentNode = node.parentNode
      baseNode.extent = node.extent as 'parent' | undefined
      baseNode.expandParent = node.expandParent
    }

    return baseNode
  })

  const edges: Edge[] = data.edges.map((edge) => {
    const edgeData: { colorFromTarget?: boolean; label?: string } = {}
    if (edge.data?.colorFromTarget) edgeData.colorFromTarget = true
    if (edge.data?.label) edgeData.label = edge.data.label
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'custom',
      data: Object.keys(edgeData).length > 0 ? edgeData : undefined,
    }
  })

  return {
    nodes,
    edges,
    name: data.name || 'Imported Diagram',
  }
}

export function mergeImport(
  existingNodes: Node<BaseNodeData>[],
  existingEdges: Edge[],
  importedNodes: Node<BaseNodeData>[],
  importedEdges: Edge[],
  offsetX: number = 300,
  offsetY: number = 100
): { nodes: Node<BaseNodeData>[]; edges: Edge[] } {
  // Create ID mapping to avoid conflicts
  const idMap = new Map<string, string>()
  const existingIds = new Set([
    ...existingNodes.map((n) => n.id),
    ...existingEdges.map((e) => e.id),
  ])

  let nodeCounter = existingNodes.length
  let edgeCounter = existingEdges.length
  let groupCounter = 0

  // Generate new IDs for imported nodes
  const newNodes = importedNodes.map((node) => {
    let newId = node.id
    while (existingIds.has(newId)) {
      if (node.type === 'groupNode') {
        newId = `group_${groupCounter++}`
      } else {
        newId = `node_${nodeCounter++}`
      }
    }
    idMap.set(node.id, newId)
    existingIds.add(newId)

    const newNode: Node<BaseNodeData> = {
      ...node,
      id: newId,
    }

    // Only offset top-level nodes (not children)
    if (!node.parentNode) {
      newNode.position = {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY,
      }
    }

    return newNode
  })

  // Update parent references with new IDs
  const nodesWithUpdatedParents = newNodes.map((node) => {
    if (node.parentNode) {
      return {
        ...node,
        parentNode: idMap.get(node.parentNode) || node.parentNode,
      }
    }
    return node
  })

  // Update edge references with new IDs
  const newEdges = importedEdges.map((edge) => {
    let newId = edge.id
    while (existingIds.has(newId)) {
      newId = `edge_${edgeCounter++}`
    }
    existingIds.add(newId)

    return {
      ...edge,
      id: newId,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }
  })

  return {
    nodes: [...existingNodes, ...nodesWithUpdatedParents],
    edges: [...existingEdges, ...newEdges],
  }
}

export function readFileAsJSON(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        resolve(data)
      } catch {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Mermaid Code Parser
 * Extracts nodes and edges from Mermaid flowchart syntax for AI context
 */

import type { FlowchartNode, FlowchartEdge, FlowchartContext } from '../types/flowchart'

/**
 * Parse Mermaid flowchart code and extract nodes and edges
 */
export function parseMermaidCode(code: string): { nodes: FlowchartNode[]; edges: FlowchartEdge[] } {
  const nodes: FlowchartNode[] = []
  const edges: FlowchartEdge[] = []

  // Handle undefined/null/empty code
  if (!code || typeof code !== 'string') {
    return { nodes, edges }
  }

  const nodeMap = new Map<string, FlowchartNode>()

  const lines = code.split('\n')
  let currentSubgraph: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('%%')) continue

    // Track subgraph context
    if (trimmed.startsWith('subgraph')) {
      const match = trimmed.match(/subgraph\s+["']?([^"']+)["']?/)
      currentSubgraph = match?.[1]
      continue
    }

    if (trimmed === 'end') {
      currentSubgraph = undefined
      continue
    }

    // Skip flowchart declaration
    if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) continue

    // Parse edges (A --> B or A -->|label| B)
    const edgeMatch = trimmed.match(/^(\w+)\s*(-->|---|-\.->|==>|--o|--x)(\|[^|]+\|)?\s*(\w+)/)
    if (edgeMatch) {
      const [, source, , labelPart, target] = edgeMatch
      const label = labelPart?.slice(1, -1)

      edges.push({
        id: `edge-${source}-${target}`,
        source,
        target,
        label,
      })

      // Ensure both nodes exist
      if (!nodeMap.has(source)) {
        const node: FlowchartNode = { id: source, label: source, nodeType: 'process', subgraph: currentSubgraph }
        nodeMap.set(source, node)
        nodes.push(node)
      }
      if (!nodeMap.has(target)) {
        const node: FlowchartNode = { id: target, label: target, nodeType: 'process', subgraph: currentSubgraph }
        nodeMap.set(target, node)
        nodes.push(node)
      }
      continue
    }

    // Parse node definitions
    // Stadium: A([Label])
    const stadiumMatch = trimmed.match(/^(\w+)\(\[([^\]]+)\]\)/)
    if (stadiumMatch) {
      const [, id, label] = stadiumMatch
      const existingNode = nodeMap.get(id)
      if (!existingNode) {
        const node: FlowchartNode = { id, label, nodeType: 'start_end', subgraph: currentSubgraph }
        nodeMap.set(id, node)
        nodes.push(node)
      } else {
        existingNode.label = label
        existingNode.nodeType = 'start_end'
      }
      continue
    }

    // Diamond: A{Label}
    const diamondMatch = trimmed.match(/^(\w+)\{([^}]+)\}/)
    if (diamondMatch) {
      const [, id, label] = diamondMatch
      const existingNode = nodeMap.get(id)
      if (!existingNode) {
        const node: FlowchartNode = { id, label, nodeType: 'decision', subgraph: currentSubgraph }
        nodeMap.set(id, node)
        nodes.push(node)
      } else {
        existingNode.label = label
        existingNode.nodeType = 'decision'
      }
      continue
    }

    // Database: A[(Label)]
    const dbMatch = trimmed.match(/^(\w+)\[\(([^)]+)\)\]/)
    if (dbMatch) {
      const [, id, label] = dbMatch
      const existingNode = nodeMap.get(id)
      if (!existingNode) {
        const node: FlowchartNode = { id, label, nodeType: 'database', subgraph: currentSubgraph }
        nodeMap.set(id, node)
        nodes.push(node)
      } else {
        existingNode.label = label
        existingNode.nodeType = 'database'
      }
      continue
    }

    // Subprocess: A[[Label]]
    const subprocessMatch = trimmed.match(/^(\w+)\[\[([^\]]+)\]\]/)
    if (subprocessMatch) {
      const [, id, label] = subprocessMatch
      const existingNode = nodeMap.get(id)
      if (!existingNode) {
        const node: FlowchartNode = { id, label, nodeType: 'subprocess', subgraph: currentSubgraph }
        nodeMap.set(id, node)
        nodes.push(node)
      } else {
        existingNode.label = label
        existingNode.nodeType = 'subprocess'
      }
      continue
    }

    // Parallelogram: A[/Label/]
    const paraMatch = trimmed.match(/^(\w+)\[\/([^/]+)\/\]/)
    if (paraMatch) {
      const [, id, label] = paraMatch
      const existingNode = nodeMap.get(id)
      if (!existingNode) {
        const node: FlowchartNode = { id, label, nodeType: 'data', subgraph: currentSubgraph }
        nodeMap.set(id, node)
        nodes.push(node)
      } else {
        existingNode.label = label
        existingNode.nodeType = 'data'
      }
      continue
    }

    // Circle: A((Label))
    const circleMatch = trimmed.match(/^(\w+)\(\(([^)]+)\)\)/)
    if (circleMatch) {
      const [, id, label] = circleMatch
      const existingNode = nodeMap.get(id)
      if (!existingNode) {
        const node: FlowchartNode = { id, label, nodeType: 'connector', subgraph: currentSubgraph }
        nodeMap.set(id, node)
        nodes.push(node)
      } else {
        existingNode.label = label
        existingNode.nodeType = 'connector'
      }
      continue
    }

    // Rectangle: A[Label]
    const rectMatch = trimmed.match(/^(\w+)\[([^\]]+)\]/)
    if (rectMatch) {
      const [, id, label] = rectMatch
      const existingNode = nodeMap.get(id)
      if (!existingNode) {
        const node: FlowchartNode = { id, label, nodeType: 'process', subgraph: currentSubgraph }
        nodeMap.set(id, node)
        nodes.push(node)
      } else {
        existingNode.label = label
      }
      continue
    }

    // Rounded: A(Label)
    const roundMatch = trimmed.match(/^(\w+)\(([^)]+)\)/)
    if (roundMatch) {
      const [, id, label] = roundMatch
      const existingNode = nodeMap.get(id)
      if (!existingNode) {
        const node: FlowchartNode = { id, label, nodeType: 'process', subgraph: currentSubgraph }
        nodeMap.set(id, node)
        nodes.push(node)
      } else {
        existingNode.label = label
      }
    }
  }

  return { nodes, edges }
}

/**
 * Extract flowchart context from Mermaid code for AI operations
 */
export function extractFlowchartContext(mermaidCode: string): FlowchartContext {
  // Handle undefined/null/empty code
  if (!mermaidCode || typeof mermaidCode !== 'string') {
    return {
      nodes: [],
      edges: [],
      subgraphs: [],
      direction: 'TB',
      mermaidCode: '',
    }
  }

  const { nodes, edges } = parseMermaidCode(mermaidCode)

  // Extract direction
  const directionMatch = mermaidCode.match(/flowchart\s+(TB|TD|BT|LR|RL)/)
  const direction = (directionMatch?.[1] as FlowchartContext['direction']) || 'TB'

  // Extract subgraphs
  const subgraphs: FlowchartContext['subgraphs'] = []
  const subgraphMatches = mermaidCode.matchAll(/subgraph\s+["']?([^"'\n]+)["']?/g)
  for (const match of subgraphMatches) {
    subgraphs.push({
      id: match[1].toLowerCase().replace(/\s+/g, '_'),
      label: match[1],
    })
  }

  return {
    nodes,
    edges,
    subgraphs,
    direction,
    mermaidCode,
  }
}

/**
 * Mind Map Types (Simplified)
 */

import type { Node, Edge } from 'reactflow'
import type { MindMapNodeTypeId } from '../config/nodeConfig'

/**
 * Mind Map Node Data
 */
export interface MindMapNodeData {
  label: string
  nodeType: MindMapNodeTypeId
  // Editing state
  isEditing?: boolean
  // Callbacks
  onLabelChange?: (newLabel: string) => void
  onStartEditing?: () => void
  onStopEditing?: () => void
}

/**
 * Branch Edge Data
 */
export interface BranchEdgeData {
  label?: string
}

/**
 * Mind Map Node type alias
 */
export type MindMapNode = Node<MindMapNodeData>

/**
 * Mind Map Edge type alias
 */
export type MindMapEdge = Edge<BranchEdgeData>

/**
 * Mind Map State
 */
export interface MindMapState {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

/**
 * Expand Branch Result (for AI)
 */
export interface ExpandBranchResult {
  parentNodeId: string
  newNodes: MindMapNode[]
  newEdges: MindMapEdge[]
}

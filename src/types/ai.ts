/**
 * TypeScript types for AI diagram generation feature
 */

// AI execution mode
export type AIMode = 'advanced' | 'quick'

// Generation status
export type GenerationStatus =
  | 'idle'
  | 'generating'
  | 'complete'
  | 'error'

// Position on canvas
export interface Position {
  x: number
  y: number
}

// Volume attachment
export interface VolumeAttachment {
  name: string
  mountPath: string
}

// Node data from generation
export interface GeneratedNodeData {
  label: string
  nodeType: string
  tags: string[]
  volumes: VolumeAttachment[]
  isGroup: boolean
}

// Positioned node from API
export interface PositionedNode {
  id: string
  type: 'customNode' | 'groupNode'
  position: Position
  data: GeneratedNodeData
  parentNode?: string
  extent?: string
  expandParent?: boolean
  style?: Record<string, unknown>
}

// Edge data
export interface PositionedEdgeData {
  label?: string
  colorFromTarget?: boolean
}

// Positioned edge from API
export interface PositionedEdge {
  id: string
  source: string
  target: string
  type: string
  sourceHandle?: string | null
  targetHandle?: string | null
  data?: PositionedEdgeData | null
}

// Complete diagram from API
export interface PositionedDiagram {
  version: string
  name: string
  exportedAt: string
  nodes: PositionedNode[]
  edges: PositionedEdge[]
}

// API response for text generation (legacy)
export interface DiagramResponse {
  success: boolean
  diagram: PositionedDiagram | null
  message: string
  error?: string
}

// Request for text generation (legacy)
export interface TextGenerationRequest {
  description: string
}

// ============================================
// CRUD Operations Types
// ============================================

// Operation types supported by the AI
export type OperationType =
  | 'generate'
  | 'add'
  | 'modify'
  | 'delete'
  | 'connect'
  | 'disconnect'
  | 'group'

// Context node for sending diagram state to AI
export interface ContextNode {
  id: string
  label: string
  nodeType?: string  // Optional for group nodes
  tags: string[]
  parentGroup?: string
  isGroup: boolean
}

// Context edge for sending diagram state to AI
export interface ContextEdge {
  id: string
  source: string
  target: string
  label?: string
}

// Diagram context to send with operations
export interface DiagramContext {
  nodes: ContextNode[]
  edges: ContextEdge[]
}

// Node modification
export interface NodeModification {
  node_id: string
  new_label?: string
  new_tags?: string[]
  add_tags?: string[]
  remove_tags?: string[]
  add_volumes?: VolumeAttachment[]
  new_parent_group?: string
}

// Edge modification
export interface EdgeModification {
  edge_id: string
  new_label?: string
  new_source?: string
  new_target?: string
}

// Group creation
export interface GroupCreation {
  group_id: string
  group_label: string
  group_tags: string[]
  node_ids: string[]
}

// Conversation message for history
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

// Request for AI operation (with context)
export interface OperationRequest {
  description: string
  context?: DiagramContext
  conversation_history?: ConversationMessage[]
  mode?: AIMode
}

// Response from AI operation
export interface OperationResponse {
  success: boolean
  operation_type: OperationType
  message: string
  // For full generation
  diagram?: PositionedDiagram
  // For incremental operations
  nodes_to_add: PositionedNode[]
  nodes_to_modify: NodeModification[]
  nodes_to_delete: string[]
  edges_to_add: PositionedEdge[]
  edges_to_modify: EdgeModification[]
  edges_to_delete: string[]
  groups_to_create: GroupCreation[]
}

// Merge data for incremental operations
export interface MergeData {
  operation_type: OperationType
  nodes_to_add: PositionedNode[]
  nodes_to_modify: NodeModification[]
  nodes_to_delete: string[]
  edges_to_add: PositionedEdge[]
  edges_to_modify: EdgeModification[]
  edges_to_delete: string[]
  groups_to_create: GroupCreation[]
  message: string
}

// ============================================
// Chat Assistant Types
// ============================================

// Chat message in the assistant panel
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type: 'text' | 'action'
  status?: 'pending' | 'complete' | 'error'
  metadata?: {
    operationType?: OperationType
    affectedNodes?: string[]
  }
}

// AI Assistant panel state
export interface AIAssistantState {
  // UI State
  isExpanded: boolean
  unreadCount: number

  // Chat State
  messages: ChatMessage[]

  // Processing State
  status: GenerationStatus
}

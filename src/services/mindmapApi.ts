/**
 * API client for AI mind map operations
 */

import type { ConversationMessage, AIMode } from '../types/ai'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const WS_MINDMAP_REALTIME_URL =
  import.meta.env.VITE_WS_MINDMAP_URL || 'ws://localhost:8000/api/mindmap/ws/realtime'

// Mind Map specific types
export interface MindMapContextNode {
  id: string
  label: string
  nodeType: string // topic, branch, note
}

export interface MindMapContextEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface MindMapContext {
  nodes: MindMapContextNode[]
  edges: MindMapContextEdge[]
}

export interface MindMapNode {
  id: string
  label: string
  nodeType: string
  position?: { x: number; y: number }
}

export interface MindMapEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface MindMapNodeModification {
  id: string
  label?: string
  nodeType?: string
}

export interface MindMapEdgeModification {
  id: string
  label?: string
}

export interface MindMapOperationRequest {
  description: string
  context?: MindMapContext
  conversation_history?: ConversationMessage[]
  mode?: AIMode
}

export interface MindMapOperationResponse {
  success: boolean
  operation_type: string
  message: string
  // Full mind map (for generate operation)
  mindmap?: {
    nodeData: {
      id: string
      topic: string
      children?: unknown[]
    }
  }
  // Incremental changes
  nodes_to_add: MindMapNode[]
  nodes_to_modify: MindMapNodeModification[]
  nodes_to_delete: string[]
  edges_to_add: MindMapEdge[]
  edges_to_modify: MindMapEdgeModification[]
  edges_to_delete: string[]
}

/**
 * Execute a mind map AI operation
 */
export async function executeMindMapOperation(
  description: string,
  context?: MindMapContext,
  conversationHistory?: ConversationMessage[],
  mode: AIMode = 'advanced'
): Promise<MindMapOperationResponse> {
  const request: MindMapOperationRequest = {
    description,
    context,
    conversation_history: conversationHistory,
    mode,
  }

  const response = await fetch(`${API_BASE_URL}/api/mindmap/operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || `Mind map operation failed: ${response.statusText}`)
  }

  return response.json()
}

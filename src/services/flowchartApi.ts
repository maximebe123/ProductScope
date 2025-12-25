/**
 * API client for AI flowchart operations
 */

import type { ConversationMessage, AIMode } from '../types/ai'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Flowchart specific types
export interface FlowchartContextNode {
  id: string
  label: string
  nodeType: string
}

export interface FlowchartContextEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface FlowchartContextSubgraph {
  id: string
  label: string
}

export interface FlowchartContext {
  nodes: FlowchartContextNode[]
  edges: FlowchartContextEdge[]
  subgraphs: FlowchartContextSubgraph[]
  direction: string
  mermaidCode: string
}

export interface FlowchartOperationRequest {
  description: string
  context?: FlowchartContext
  conversation_history?: ConversationMessage[]
  mode?: AIMode
}

export interface FlowchartOperationResponse {
  success: boolean
  operation_type: string
  message: string
  // Full flowchart code (for generate operation)
  mermaid_code?: string
  // Incremental code changes
  code_to_append?: string
  lines_to_remove: number[]
}

/**
 * Execute a flowchart AI operation
 */
export async function executeFlowchartOperation(
  description: string,
  context?: FlowchartContext,
  conversationHistory?: ConversationMessage[],
  mode: AIMode = 'advanced'
): Promise<FlowchartOperationResponse> {
  const request: FlowchartOperationRequest = {
    description,
    context,
    conversation_history: conversationHistory,
    mode,
  }

  const response = await fetch(`${API_BASE_URL}/api/flowchart/operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || `Flowchart operation failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fix Mermaid syntax errors using AI
 */
export async function fixFlowchartSyntax(
  mermaidCode: string,
  errorMessage: string
): Promise<FlowchartOperationResponse> {
  const request: FlowchartOperationRequest = {
    description: errorMessage,
    context: {
      nodes: [],
      edges: [],
      subgraphs: [],
      direction: 'TB',
      mermaidCode,
    },
    mode: 'quick',
  }

  const response = await fetch(`${API_BASE_URL}/api/flowchart/fix-syntax`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || `Fix syntax failed: ${response.statusText}`)
  }

  return response.json()
}

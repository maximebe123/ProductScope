/**
 * Streaming API client for AI diagram generation with thinking visualization
 *
 * Connects to the /operations/stream-thinking SSE endpoint
 * to receive real-time reasoning tokens from GPT-5 agents.
 */

import type {
  DiagramContext,
  ConversationMessage,
  OperationResponse,
} from '../types/ai'
import { ApiError } from './aiApi'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Event types from the streaming endpoint
 */
export type StreamEventType =
  | 'agent_start'
  | 'reasoning'
  | 'content'
  | 'agent_complete'
  | 'review'
  | 'complete'
  | 'error'

export type AgentName =
  | 'architect'
  | 'component'
  | 'connection'
  | 'grouping'
  | 'layout'
  | 'reviewer'
  | 'finalizer'

export interface AgentStartEvent {
  type: 'agent_start'
  agent: AgentName
  description: string
}

export interface ReasoningEvent {
  type: 'reasoning'
  agent: AgentName
  token: string
}

export interface ContentEvent {
  type: 'content'
  agent: AgentName
  token: string
}

export interface AgentCompleteEvent {
  type: 'agent_complete'
  agent: AgentName
  summary?: string
}

export interface ReviewEvent {
  type: 'review'
  score: number
  decision: string
  issues: string[]
}

export interface CompleteEvent {
  type: 'complete'
  data: OperationResponse
}

export interface ErrorEvent {
  type: 'error'
  message: string
  agent?: AgentName
}

export type StreamEvent =
  | AgentStartEvent
  | ReasoningEvent
  | ContentEvent
  | AgentCompleteEvent
  | ReviewEvent
  | CompleteEvent
  | ErrorEvent

/**
 * Callbacks for streaming events
 */
export interface StreamingCallbacks {
  onAgentStart?: (agent: AgentName, description: string) => void
  onReasoning?: (agent: AgentName, token: string) => void
  onContent?: (agent: AgentName, token: string) => void
  onAgentComplete?: (agent: AgentName, summary?: string) => void
  onReview?: (score: number, decision: string, issues: string[]) => void
  onComplete?: (data: OperationResponse) => void
  onError?: (message: string, agent?: AgentName) => void
}

/**
 * Handle a single stream event by calling the appropriate callback
 */
function handleStreamEvent(
  event: StreamEvent,
  callbacks: StreamingCallbacks
): void {
  switch (event.type) {
    case 'agent_start':
      callbacks.onAgentStart?.(event.agent, event.description)
      break
    case 'reasoning':
      callbacks.onReasoning?.(event.agent, event.token)
      break
    case 'content':
      callbacks.onContent?.(event.agent, event.token)
      break
    case 'agent_complete':
      callbacks.onAgentComplete?.(event.agent, event.summary)
      break
    case 'review':
      callbacks.onReview?.(event.score, event.decision, event.issues)
      break
    case 'complete':
      callbacks.onComplete?.(event.data)
      break
    case 'error':
      callbacks.onError?.(event.message, event.agent)
      break
  }
}

/**
 * Execute an AI operation with streaming reasoning tokens
 *
 * Uses Server-Sent Events (SSE) to receive real-time updates
 * from the multi-agent pipeline.
 *
 * @param description - User's natural language request
 * @param callbacks - Callbacks for each event type
 * @param context - Current diagram state (optional)
 * @param conversationHistory - Previous conversation messages
 * @param signal - AbortSignal for cancellation
 * @returns Promise that resolves when the stream completes
 */
export async function executeOperationWithStreaming(
  description: string,
  callbacks: StreamingCallbacks,
  context?: DiagramContext,
  conversationHistory?: ConversationMessage[],
  signal?: AbortSignal
): Promise<OperationResponse | null> {
  const body = {
    description,
    context,
    conversation_history: conversationHistory,
    mode: 'advanced',
  }

  let response: Response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/diagrams/operations/stream-thinking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal,
      }
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      callbacks.onError?.('Request was cancelled')
      return null
    }
    throw new ApiError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    )
  }

  if (!response.ok) {
    let details: string | undefined
    try {
      const json = await response.json()
      details = json.detail || json.message
    } catch {
      details = response.statusText
    }
    throw new ApiError(
      response.status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN',
      details || `Request failed: ${response.status}`,
      response.status,
      details
    )
  }

  if (!response.body) {
    throw new ApiError('SERVER_ERROR', 'No response body received')
  }

  // Parse SSE stream
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: OperationResponse | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE events (data: {...}\n\n)
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        // SSE format: "data: {...}"
        const match = line.match(/^data:\s*(.+)$/m)
        if (match) {
          try {
            const event = JSON.parse(match[1]) as StreamEvent
            handleStreamEvent(event, callbacks)

            // Capture final result
            if (event.type === 'complete') {
              finalResult = event.data
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE event:', match[1], parseError)
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const match = buffer.match(/^data:\s*(.+)$/m)
      if (match) {
        try {
          const event = JSON.parse(match[1]) as StreamEvent
          handleStreamEvent(event, callbacks)
          if (event.type === 'complete') {
            finalResult = event.data
          }
        } catch {
          // Ignore parse errors for final buffer
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return finalResult
}

/**
 * Agent progress state for tracking pipeline progress
 */
export interface AgentProgress {
  agent: AgentName
  status: 'pending' | 'running' | 'complete'
  description?: string
  summary?: string
}

/**
 * Streaming state for UI updates
 */
export interface StreamingState {
  isStreaming: boolean
  currentAgent: AgentName | null
  reasoningContent: string
  agentProgress: AgentProgress[]
}

/**
 * Create initial streaming state
 */
export function createInitialStreamingState(): StreamingState {
  return {
    isStreaming: false,
    currentAgent: null,
    reasoningContent: '',
    agentProgress: [],
  }
}

/**
 * Agent pipeline order for progress display
 */
export const AGENT_ORDER: AgentName[] = [
  'architect',
  'component',
  'connection',
  'grouping',
  'layout',
  'reviewer',
  'finalizer',
]

/**
 * Human-readable agent labels
 */
export const AGENT_LABELS: Record<AgentName, string> = {
  architect: 'Architect',
  component: 'Component Expert',
  connection: 'Connection Expert',
  grouping: 'Grouping Strategist',
  layout: 'Layout Optimizer',
  reviewer: 'Quality Reviewer',
  finalizer: 'Finalizer',
}

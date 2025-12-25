/**
 * API client for AI diagram generation
 * With improved error handling and retry logic
 */

import type {
  TextGenerationRequest,
  DiagramResponse,
  OperationRequest,
  OperationResponse,
  DiagramContext,
  ConversationMessage,
  AIMode,
} from '../types/ai'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const WS_REALTIME_URL =
  import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/diagrams/ws/realtime'

/**
 * API Error types for better error handling
 */
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'UNKNOWN'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status?: number
  readonly details?: string

  constructor(code: ApiErrorCode, message: string, status?: number, details?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }

  /**
   * Get a user-friendly error message
   */
  get userMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection.'
      case 'RATE_LIMITED':
        return 'Too many requests. Please wait a moment before trying again.'
      case 'VALIDATION_ERROR':
        return this.details || 'Invalid request. Please check your input.'
      case 'UNAUTHORIZED':
        return 'Authentication required. Please refresh the page.'
      case 'SERVER_ERROR':
        return 'Server error. Our team has been notified.'
      default:
        return this.message || 'An unexpected error occurred.'
    }
  }

  /**
   * Check if this error is retryable
   */
  get isRetryable(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'SERVER_ERROR'
  }
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  const status = response.status
  let details: string | undefined

  try {
    const json = await response.json()
    details = json.detail || json.message || json.error
  } catch {
    details = response.statusText
  }

  // Categorize by status code
  if (status === 429) {
    return new ApiError('RATE_LIMITED', 'Rate limit exceeded', status, details)
  }

  if (status === 400) {
    return new ApiError('VALIDATION_ERROR', details || 'Validation failed', status, details)
  }

  if (status === 401 || status === 403) {
    return new ApiError('UNAUTHORIZED', 'Unauthorized', status, details)
  }

  if (status === 404) {
    return new ApiError('NOT_FOUND', 'Resource not found', status, details)
  }

  if (status >= 500) {
    return new ApiError('SERVER_ERROR', 'Server error', status, details)
  }

  return new ApiError('UNKNOWN', details || `Request failed: ${status}`, status, details)
}

/**
 * Make a fetch request with error handling
 */
async function fetchWithErrorHandling<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  let response: Response

  try {
    response = await fetch(url, options)
  } catch (error) {
    // Network error (offline, DNS failure, etc.)
    throw new ApiError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    )
  }

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  try {
    return await response.json()
  } catch {
    throw new ApiError('SERVER_ERROR', 'Invalid response from server')
  }
}

/**
 * Generate a diagram from a text description (legacy endpoint)
 */
export async function generateDiagramFromText(
  description: string
): Promise<DiagramResponse> {
  const request: TextGenerationRequest = { description }

  return fetchWithErrorHandling<DiagramResponse>(
    `${API_BASE_URL}/api/diagrams/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  )
}

/**
 * Execute an AI operation with optional diagram context
 * This is the new endpoint that supports all CRUD operations
 */
export async function executeOperation(
  description: string,
  context?: DiagramContext,
  conversationHistory?: ConversationMessage[],
  mode: AIMode = 'advanced'
): Promise<OperationResponse> {
  const request: OperationRequest = {
    description,
    context,
    conversation_history: conversationHistory,
    mode,
  }

  return fetchWithErrorHandling<OperationResponse>(
    `${API_BASE_URL}/api/diagrams/operations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  )
}

/**
 * Check if the AI backend is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      // Short timeout for health checks
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

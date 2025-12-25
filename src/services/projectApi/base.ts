/**
 * Base utilities for Project API
 * Shared helpers, error handling, and fetch wrapper
 */

import { ApiError } from '../aiApi'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function parseErrorResponse(response: Response): Promise<ApiError> {
  const status = response.status
  let details: string | undefined

  try {
    const json = await response.json()
    details = json.detail || json.message || json.error
  } catch {
    details = response.statusText
  }

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

export async function fetchWithErrorHandling<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch (error) {
    throw new ApiError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    )
  }

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  try {
    return await response.json()
  } catch {
    throw new ApiError('SERVER_ERROR', 'Invalid response from server')
  }
}

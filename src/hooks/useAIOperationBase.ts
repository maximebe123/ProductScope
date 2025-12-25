/**
 * Base hook for AI operations
 * Provides common state management and error handling patterns
 */

import { useState, useCallback } from 'react'

export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error'

export interface AIOperationState {
  status: GenerationStatus
  error: string | null
  message: string | null
}

export interface AIOperationActions {
  setGenerating: () => void
  setComplete: (message: string) => void
  setError: (error: string) => void
  reset: () => void
}

export interface UseAIOperationBaseResult extends AIOperationState, AIOperationActions {}

/**
 * Base hook for AI operations providing common state and actions
 */
export function useAIOperationBase(): UseAIOperationBaseResult {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const setGenerating = useCallback(() => {
    setStatus('generating')
    setError(null)
    setMessage(null)
  }, [])

  const setComplete = useCallback((msg: string) => {
    setMessage(msg)
    setStatus('complete')
  }, [])

  const setErrorState = useCallback((err: string) => {
    setError(err)
    setStatus('error')
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setMessage(null)
  }, [])

  return {
    status,
    error,
    message,
    setGenerating,
    setComplete,
    setError: setErrorState,
    reset,
  }
}

/**
 * Wrapper to execute an AI operation with standard error handling
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  actions: AIOperationActions
): Promise<T> {
  actions.setGenerating()
  try {
    return await operation()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    actions.setError(errorMessage)
    throw err
  }
}

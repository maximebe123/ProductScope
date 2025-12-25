/**
 * Hook for AI flowchart generation with Mermaid.js
 */

import { useState, useCallback } from 'react'
import type { ConversationMessage, AIMode } from '../types/ai'
import {
  executeFlowchartOperation,
  type FlowchartContext,
} from '../services/flowchartApi'

type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error'

// Callbacks for flowchart operations
export interface FlowchartOperationCallbacks {
  onFullFlowchart: (code: string) => void
  onCodeUpdate: (code: string) => void
}

interface UseFlowchartAIGenerationResult {
  status: GenerationStatus
  error: string | null
  message: string | null
  executeAIOperation: (
    description: string,
    currentContext: FlowchartContext | null,
    callbacks: FlowchartOperationCallbacks,
    conversationHistory?: ConversationMessage[],
    mode?: AIMode
  ) => Promise<string>
  reset: () => void
}

export function useFlowchartAIGeneration(): UseFlowchartAIGenerationResult {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const executeAIOperation = useCallback(
    async (
      description: string,
      currentContext: FlowchartContext | null,
      callbacks: FlowchartOperationCallbacks,
      conversationHistory?: ConversationMessage[],
      mode: AIMode = 'advanced'
    ) => {
      setStatus('generating')
      setError(null)
      setMessage(null)

      try {
        // Execute operation
        const response = await executeFlowchartOperation(
          description,
          currentContext || undefined,
          conversationHistory,
          mode
        )

        if (response.success) {
          setMessage(response.message)

          // Check if this is a full flowchart generation or modification
          if (response.mermaid_code) {
            // Full generation or modification - use onFullFlowchart
            if (response.operation_type === 'generate') {
              callbacks.onFullFlowchart(response.mermaid_code)
            } else {
              // For modify, delete, subgraph, expand, direction - also replace full code
              callbacks.onCodeUpdate(response.mermaid_code)
            }
          } else if (response.code_to_append) {
            // Incremental addition
            const existingCode = currentContext?.mermaidCode || ''
            const newCode = existingCode + '\n' + response.code_to_append
            callbacks.onCodeUpdate(newCode)
          }

          setStatus('complete')
          return response.message || 'Done!'
        } else {
          throw new Error(response.message || 'Operation failed')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setStatus('error')
        throw err
      }
    },
    []
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setMessage(null)
  }, [])

  return {
    status,
    error,
    message,
    executeAIOperation,
    reset,
  }
}

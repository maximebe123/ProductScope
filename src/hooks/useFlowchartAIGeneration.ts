/**
 * Hook for AI flowchart generation with Mermaid.js
 */

import { useCallback } from 'react'
import type { ConversationMessage, AIMode } from '../types/ai'
import {
  executeFlowchartOperation,
  type FlowchartContext,
} from '../services/flowchartApi'
import { useAIOperationBase, type GenerationStatus } from './useAIOperationBase'

// Re-export for backwards compatibility
export type { GenerationStatus }

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
  const { status, error, message, setGenerating, setComplete, setError, reset } = useAIOperationBase()

  const executeAIOperation = useCallback(
    async (
      description: string,
      currentContext: FlowchartContext | null,
      callbacks: FlowchartOperationCallbacks,
      conversationHistory?: ConversationMessage[],
      mode: AIMode = 'advanced'
    ) => {
      setGenerating()

      try {
        const response = await executeFlowchartOperation(
          description,
          currentContext || undefined,
          conversationHistory,
          mode
        )

        if (response.success) {
          // Check if this is a full flowchart generation or modification
          if (response.mermaid_code) {
            if (response.operation_type === 'generate') {
              callbacks.onFullFlowchart(response.mermaid_code)
            } else {
              callbacks.onCodeUpdate(response.mermaid_code)
            }
          } else if (response.code_to_append) {
            const existingCode = currentContext?.mermaidCode || ''
            const newCode = existingCode + '\n' + response.code_to_append
            callbacks.onCodeUpdate(newCode)
          }

          const msg = response.message || 'Done!'
          setComplete(msg)
          return msg
        } else {
          throw new Error(response.message || 'Operation failed')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        throw err
      }
    },
    [setGenerating, setComplete, setError]
  )

  return {
    status,
    error,
    message,
    executeAIOperation,
    reset,
  }
}

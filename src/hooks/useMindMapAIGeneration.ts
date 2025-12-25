/**
 * Hook for AI mind map generation with CRUD operations
 */

import { useState, useCallback } from 'react'
import type { ConversationMessage, AIMode } from '../types/ai'
import type { MindElixirData, NodeObj } from 'mind-elixir'
import {
  executeMindMapOperation,
  type MindMapContext,
  type MindMapOperationResponse,
} from '../services/mindmapApi'
import { NOTE_STYLE } from '../modules/mindmap/types/mindElixir'

type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error'

// Callbacks for mind map operations
export interface MindMapOperationCallbacks {
  onFullMindMap: (data: MindElixirData) => void
  onMergeChanges: (changes: {
    nodes_to_add?: Array<{ id: string; parentId: string; label: string; nodeType: string }>
    nodes_to_modify?: Array<{ id: string; label?: string }>
    nodes_to_delete?: string[]
  }) => void
}

interface UseMindMapAIGenerationResult {
  status: GenerationStatus
  error: string | null
  message: string | null
  executeAIOperation: (
    description: string,
    currentData: MindElixirData | null,
    callbacks: MindMapOperationCallbacks,
    conversationHistory?: ConversationMessage[],
    mode?: AIMode
  ) => Promise<string>
  reset: () => void
}

/**
 * Convert MindElixir data to context format for AI
 */
function buildMindMapContext(data: MindElixirData | null): MindMapContext | undefined {
  if (!data || !data.nodeData) {
    return undefined
  }

  const nodes: MindMapContext['nodes'] = []
  const edges: MindMapContext['edges'] = []

  function traverse(node: NodeObj, parentId?: string) {
    // Determine node type
    let nodeType = 'branch'
    if (!parentId) {
      nodeType = 'topic'
    } else if (NOTE_STYLE && node.style?.background === NOTE_STYLE.background) {
      nodeType = 'note'
    }

    nodes.push({
      id: node.id,
      label: node.topic,
      nodeType,
    })

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
      })
    }

    node.children?.forEach((child) => traverse(child, node.id))
  }

  traverse(data.nodeData)

  return { nodes, edges }
}

/**
 * Convert API response mindmap to MindElixir format
 * Backend now returns MindElixir tree format directly: { nodeData: { id, topic, children } }
 */
function convertResponseToMindElixir(response: MindMapOperationResponse): MindElixirData | null {
  if (response.mindmap?.nodeData) {
    return response.mindmap as unknown as MindElixirData
  }
  return null
}

/**
 * Convert incremental changes to merge format
 */
function convertChangesToMergeFormat(response: MindMapOperationResponse): {
  nodes_to_add?: Array<{ id: string; parentId: string; label: string; nodeType: string }>
  nodes_to_modify?: Array<{ id: string; label?: string }>
  nodes_to_delete?: string[]
} {
  const changes: {
    nodes_to_add?: Array<{ id: string; parentId: string; label: string; nodeType: string }>
    nodes_to_modify?: Array<{ id: string; label?: string }>
    nodes_to_delete?: string[]
  } = {}

  if (response.nodes_to_add?.length) {
    // Find parent IDs from edges_to_add
    const parentMap = new Map<string, string>()
    response.edges_to_add?.forEach((edge) => {
      parentMap.set(edge.target, edge.source)
    })

    changes.nodes_to_add = response.nodes_to_add.map((node) => ({
      id: node.id,
      parentId: parentMap.get(node.id) || '',
      label: node.label,
      nodeType: node.nodeType,
    }))
  }

  if (response.nodes_to_modify?.length) {
    changes.nodes_to_modify = response.nodes_to_modify.map((mod) => ({
      id: mod.id,
      label: mod.label,
    }))
  }

  if (response.nodes_to_delete?.length) {
    changes.nodes_to_delete = response.nodes_to_delete
  }

  return changes
}

export function useMindMapAIGeneration(): UseMindMapAIGenerationResult {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const executeAIOperation = useCallback(
    async (
      description: string,
      currentData: MindElixirData | null,
      callbacks: MindMapOperationCallbacks,
      conversationHistory?: ConversationMessage[],
      mode: AIMode = 'advanced'
    ) => {
      setStatus('generating')
      setError(null)
      setMessage(null)

      try {
        // Build context from current mind map
        const context = buildMindMapContext(currentData)

        // Execute operation
        const response = await executeMindMapOperation(
          description,
          context,
          conversationHistory,
          mode
        )

        if (response.success) {
          setMessage(response.message)

          // Check if this is a full mind map generation
          if (response.operation_type === 'generate' && response.mindmap) {
            const mindElixirData = convertResponseToMindElixir(response)
            if (mindElixirData) {
              callbacks.onFullMindMap(mindElixirData)
            }
          } else {
            // Incremental operation
            const changes = convertChangesToMergeFormat(response)
            callbacks.onMergeChanges(changes)
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

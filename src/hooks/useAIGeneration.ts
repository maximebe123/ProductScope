/**
 * Hook for text-based AI diagram generation with CRUD operations
 */

import { useCallback } from 'react'
import type { Node, Edge } from 'reactflow'
import type {
  PositionedDiagram,
  OperationResponse,
  DiagramContext,
  ContextNode,
  ContextEdge,
  ConversationMessage,
  AIMode,
} from '../types/ai'
import type { BaseNodeData } from '../components/Nodes'
import { executeOperation } from '../services/aiApi'
import { useAIOperationBase, type GenerationStatus } from './useAIOperationBase'

// Re-export for backwards compatibility
export type { GenerationStatus }

// Callbacks for different operation types
export interface OperationCallbacks {
  onFullDiagram: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void
  onMergeChanges: (response: OperationResponse) => void
}

interface UseAIGenerationResult {
  status: GenerationStatus
  error: string | null
  message: string | null
  executeAIOperation: (
    description: string,
    currentNodes: Node<BaseNodeData>[],
    currentEdges: Edge[],
    callbacks: OperationCallbacks,
    conversationHistory?: ConversationMessage[],
    mode?: AIMode
  ) => Promise<string>
  reset: () => void
}

/**
 * Build diagram context from current nodes and edges
 */
function buildContext(
  nodes: Node<BaseNodeData>[],
  edges: Edge[]
): DiagramContext | undefined {
  if (nodes.length === 0 && edges.length === 0) {
    return undefined
  }

  const contextNodes: ContextNode[] = nodes.map((node) => ({
    id: node.id,
    label: node.data.label,
    nodeType: node.data.nodeType,
    tags: node.data.tags || [],
    parentGroup: node.parentNode,
    isGroup: node.data.isGroup || false,
  }))

  const contextEdges: ContextEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.data?.label,
  }))

  return { nodes: contextNodes, edges: contextEdges }
}

/**
 * Convert API response to ReactFlow nodes and edges
 */
function convertToReactFlow(diagram: PositionedDiagram): {
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
} {
  const nodes: Node<BaseNodeData>[] = diagram.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.data.label,
      nodeType: node.data.nodeType as BaseNodeData['nodeType'],
      tags: node.data.tags || [],
      volumes: node.data.volumes || [],
      isGroup: node.data.isGroup,
    },
    ...(node.parentNode && {
      parentNode: node.parentNode,
      extent: node.extent as 'parent' | undefined,
      expandParent: node.expandParent,
    }),
    ...(node.style && { style: node.style }),
  }))

  const edges: Edge[] = diagram.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'custom',
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
    data: edge.data || undefined,
  }))

  return { nodes, edges }
}

export function useAIGeneration(): UseAIGenerationResult {
  const { status, error, message, setGenerating, setComplete, setError, reset } = useAIOperationBase()

  const executeAIOperation = useCallback(
    async (
      description: string,
      currentNodes: Node<BaseNodeData>[],
      currentEdges: Edge[],
      callbacks: OperationCallbacks,
      conversationHistory?: ConversationMessage[],
      mode: AIMode = 'advanced'
    ) => {
      setGenerating()

      try {
        const context = buildContext(currentNodes, currentEdges)
        const response = await executeOperation(description, context, conversationHistory, mode)

        if (response.success) {
          if (response.operation_type === 'generate' && response.diagram) {
            const { nodes, edges } = convertToReactFlow(response.diagram)
            callbacks.onFullDiagram(nodes, edges)
          } else {
            callbacks.onMergeChanges(response)
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

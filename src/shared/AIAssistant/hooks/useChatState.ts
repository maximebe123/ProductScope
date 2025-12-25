/**
 * Chat State Hook
 * Manages chat messages and AI text interactions
 * Each module (diagrams, mindmap, flowchart) has its own persistent chat history
 *
 * Supports streaming mode for advanced AI with real-time reasoning display.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Node, Edge } from 'reactflow'
import type {
  ChatMessage,
  OperationResponse,
  MergeData,
  ConversationMessage,
  AIMode,
  DiagramContext,
} from '../../../types/ai'
import type { BaseNodeData } from '../../../modules/diagrams/components/Nodes/BaseNode'
import type { MindElixirData } from 'mind-elixir'
import { useAIGeneration } from '../../../hooks/useAIGeneration'
import { useMindMapAIGeneration } from '../../../hooks/useMindMapAIGeneration'
import { useFlowchartAIGeneration } from '../../../hooks/useFlowchartAIGeneration'
import { formatAIMessage } from '../utils/formatAIMessage'
import { storageService } from '../../storage/storageService'
import {
  executeOperationWithStreaming,
  type AgentName,
  type AgentProgress,
} from '../../../services/streamingApi'
import { chatApi, type ChatMessage as ApiChatMessage } from '../../../services/projectApi'

const CHAT_HISTORY_KEY = 'chat-history'

/**
 * Restore Date objects from JSON-parsed messages
 */
function restoreMessages(stored: ChatMessage[] | null): ChatMessage[] {
  if (!stored) return []
  return stored.map(msg => ({
    ...msg,
    timestamp: new Date(msg.timestamp)
  }))
}

/**
 * Convert API message to local ChatMessage format
 */
function apiToLocalMessage(apiMsg: ApiChatMessage): ChatMessage {
  return {
    id: apiMsg.id,
    role: apiMsg.role as 'user' | 'assistant',
    content: apiMsg.content,
    type: apiMsg.message_type as 'text' | 'action',
    status: apiMsg.status as 'pending' | 'complete' | 'error',
    timestamp: new Date(apiMsg.timestamp),
  }
}

export type ChatStatus = 'idle' | 'generating' | 'complete' | 'error'
export type ModuleType = 'diagrams' | 'mindmap' | 'flowchart'

// Mind map specific callbacks
export interface MindMapCallbacks {
  onFullMindMap: (data: MindElixirData) => void
  onMergeChanges: (changes: {
    nodes_to_add?: Array<{ id: string; parentId: string; label: string; nodeType: string }>
    nodes_to_modify?: Array<{ id: string; label?: string }>
    nodes_to_delete?: string[]
  }) => void
}

// Flowchart context type
export interface FlowchartContext {
  nodes: Array<{ id: string; label: string; nodeType: string }>
  edges: Array<{ id: string; source: string; target: string; label?: string }>
  subgraphs: Array<{ id: string; label: string }>
  direction: string
  mermaidCode: string
}

// Flowchart specific callbacks
export interface FlowchartCallbacks {
  onFullFlowchart: (code: string) => void
  onCodeUpdate: (code: string) => void
}

interface UseChatStateProps {
  moduleType: ModuleType
  aiMode: AIMode
  currentNodes: Node<BaseNodeData>[]
  currentEdges: Edge[]
  currentMindMapData: MindElixirData | null
  currentFlowchartData: FlowchartContext | null
  onFullDiagramRef: React.MutableRefObject<((nodes: Node<BaseNodeData>[], edges: Edge[]) => void) | null>
  onMergeChangesRef: React.MutableRefObject<((changes: OperationResponse | MergeData) => void) | null>
  onFullMindMapRef: React.MutableRefObject<((data: MindElixirData) => void) | null>
  onMindMapMergeChangesRef: React.MutableRefObject<MindMapCallbacks['onMergeChanges'] | null>
  onFullFlowchartRef: React.MutableRefObject<((code: string) => void) | null>
  onCodeUpdateRef: React.MutableRefObject<((code: string) => void) | null>
  // Project context for API persistence
  projectId: string | null
  diagramId: string | null
}

export function useChatState({
  moduleType,
  aiMode,
  currentNodes,
  currentEdges,
  currentMindMapData,
  currentFlowchartData,
  onFullDiagramRef,
  onMergeChangesRef,
  onFullMindMapRef,
  onMindMapMergeChangesRef,
  onFullFlowchartRef,
  onCodeUpdateRef,
  projectId,
  diagramId,
}: UseChatStateProps) {
  // Track previous module to detect changes
  const prevModuleRef = useRef<ModuleType>(moduleType)

  // Track previous project/diagram context
  const prevProjectRef = useRef<string | null>(projectId)
  const prevDiagramRef = useRef<string | null>(diagramId)

  // Check if we're in project mode
  const isProjectMode = !!(projectId && diagramId)

  // Initialize messages from localStorage (for non-project mode)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Don't load from localStorage if in project mode - will load from API
    if (projectId && diagramId) return []
    const stored = storageService.load<ChatMessage[]>(moduleType, CHAT_HISTORY_KEY)
    return restoreMessages(stored)
  })

  // Track if API messages have been loaded
  const apiLoadedRef = useRef(false)

  const [chatStatus, setChatStatus] = useState<ChatStatus>('idle')
  const [unreadCount, setUnreadCount] = useState(0)
  const messageIdCounter = useRef(0)

  // Streaming state for advanced mode thinking visualization
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingAgent, setStreamingAgent] = useState<AgentName | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [agentProgress, setAgentProgress] = useState<AgentProgress[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Handle module switching: save current messages and load new module's messages
  useEffect(() => {
    if (prevModuleRef.current !== moduleType) {
      // Save messages from previous module (using ref to avoid stale closure)
      // Note: messages from previous module were already saved by the other useEffect

      // Load messages for new module (only if NOT in project mode)
      if (!isProjectMode) {
        const stored = storageService.load<ChatMessage[]>(moduleType, CHAT_HISTORY_KEY)
        setMessages(restoreMessages(stored))
      }

      // Reset message counter for new module
      messageIdCounter.current = 0

      // Update ref
      prevModuleRef.current = moduleType
    }
  }, [moduleType, isProjectMode])

  // Load messages from API when in project mode
  useEffect(() => {
    if (!isProjectMode) {
      apiLoadedRef.current = false
      return
    }

    // Check if project/diagram context changed
    const contextChanged = prevProjectRef.current !== projectId || prevDiagramRef.current !== diagramId
    prevProjectRef.current = projectId
    prevDiagramRef.current = diagramId

    // Load from API if context changed or not yet loaded
    if ((contextChanged || !apiLoadedRef.current) && projectId && diagramId) {
      apiLoadedRef.current = true

      chatApi.getDiagramHistory(projectId, diagramId)
        .then((response) => {
          const loadedMessages = response.messages.map(apiToLocalMessage)
          setMessages(loadedMessages)
          // Set message counter based on loaded messages
          messageIdCounter.current = loadedMessages.length
        })
        .catch((err) => {
          console.error('[useChatState] Failed to load chat history from API:', err)
        })
    }
  }, [isProjectMode, projectId, diagramId])

  // Persist messages to localStorage (only when NOT in project mode)
  useEffect(() => {
    if (isProjectMode) return
    storageService.save(moduleType, CHAT_HISTORY_KEY, messages)
  }, [messages, moduleType, isProjectMode])

  // AI Generation hooks
  const { executeAIOperation } = useAIGeneration()
  const { executeAIOperation: executeMindMapAIOperation } = useMindMapAIGeneration()
  const { executeAIOperation: executeFlowchartAIOperation } = useFlowchartAIGeneration()

  const addMessage = useCallback(
    (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
      const id = `msg_${++messageIdCounter.current}`
      const newMessage: ChatMessage = {
        ...message,
        id,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])

      // Save to API if in project mode (for completed messages only)
      if (projectId && diagramId && message.status === 'complete') {
        chatApi.addDiagramMessage(projectId, diagramId, {
          role: message.role,
          content: message.content,
          message_type: message.type,
          status: message.status,
        }).catch((err) => {
          console.error('[useChatState] Failed to save message to API:', err)
        })
      }

      return id
    },
    [projectId, diagramId]
  )

  const updateMessage = useCallback(
    (id: string, updates: Partial<ChatMessage>) => {
      setMessages((prev) => {
        const updated = prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))

        // Save to API if in project mode and status changed to complete
        if (projectId && diagramId && updates.status === 'complete') {
          const message = updated.find((m) => m.id === id)
          if (message) {
            chatApi.addDiagramMessage(projectId, diagramId, {
              role: message.role,
              content: message.content,
              message_type: message.type,
              status: message.status,
            }).catch((err) => {
              console.error('[useChatState] Failed to save message to API:', err)
            })
          }
        }

        return updated
      })
    },
    [projectId, diagramId]
  )

  const sendTextMessage = useCallback(
    async (content: string) => {
      // Build conversation history from existing messages (before adding new one)
      const conversationHistory: ConversationMessage[] = messages
        .filter((msg) => msg.status === 'complete' && msg.content)
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))

      // Add user message
      addMessage({
        role: 'user',
        content,
        type: 'text',
        status: 'complete',
      })

      // Add pending assistant message
      const assistantMessageId = addMessage({
        role: 'assistant',
        content: '',
        type: 'action',
        status: 'pending',
      })

      setChatStatus('generating')

      try {
        let responseMessage: string

        if (moduleType === 'flowchart') {
          // Flowchart module
          if (!onFullFlowchartRef.current || !onCodeUpdateRef.current) {
            throw new Error('Flowchart AI callbacks not initialized')
          }

          responseMessage = await executeFlowchartAIOperation(
            content,
            currentFlowchartData,
            {
              onFullFlowchart: onFullFlowchartRef.current,
              onCodeUpdate: onCodeUpdateRef.current,
            },
            conversationHistory,
            aiMode
          )
        } else if (moduleType === 'mindmap') {
          // Mind map module
          if (!onFullMindMapRef.current || !onMindMapMergeChangesRef.current) {
            throw new Error('Mind map AI callbacks not initialized')
          }

          responseMessage = await executeMindMapAIOperation(
            content,
            currentMindMapData,
            {
              onFullMindMap: onFullMindMapRef.current,
              onMergeChanges: onMindMapMergeChangesRef.current,
            },
            conversationHistory,
            aiMode
          )
        } else {
          // Diagrams module
          if (!onFullDiagramRef.current || !onMergeChangesRef.current) {
            throw new Error('Diagram AI callbacks not initialized')
          }

          // Use streaming for advanced mode to show thinking
          if (aiMode === 'advanced') {
            // Reset streaming state
            setIsStreaming(true)
            setStreamingAgent(null)
            setStreamingContent('')
            setAgentProgress([])

            // Create abort controller for cancellation
            abortControllerRef.current = new AbortController()

            // Build diagram context
            const diagramContext: DiagramContext = {
              nodes: currentNodes.map(n => ({
                id: n.id,
                label: n.data?.label || '',
                nodeType: n.data?.nodeType || 'backend',
                tags: n.data?.tags || [],
                isGroup: n.data?.isGroup || false,
                parentGroup: n.parentNode,
              })),
              edges: currentEdges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: typeof e.label === 'string' ? e.label : '',
              })),
            }

            const result = await executeOperationWithStreaming(
              content,
              {
                onAgentStart: (agent, description) => {
                  setStreamingAgent(agent)
                  setStreamingContent('')
                  setAgentProgress(prev => [
                    ...prev,
                    { agent, status: 'running', description },
                  ])
                },
                onReasoning: (_agent, token) => {
                  setStreamingContent(prev => prev + token)
                },
                // Content tokens as fallback when reasoning isn't available
                onContent: (_agent, token) => {
                  // Only show content if no reasoning tokens have been received
                  // This provides visual feedback while the model is generating
                  setStreamingContent(prev => {
                    // Limit displayed content to avoid overwhelming the UI
                    if (prev.length > 2000) {
                      return prev.slice(-1500) + token
                    }
                    return prev + token
                  })
                },
                onAgentComplete: (agent, summary) => {
                  setAgentProgress(prev =>
                    prev.map(p =>
                      p.agent === agent
                        ? { ...p, status: 'complete', summary }
                        : p
                    )
                  )
                },
                onComplete: (data) => {
                  // Apply the result
                  if (data.operation_type === 'generate' && data.diagram) {
                    // The callback handles the conversion internally
                    onFullDiagramRef.current?.(
                      data.diagram.nodes as unknown as Node<BaseNodeData>[],
                      data.diagram.edges as Edge[]
                    )
                  } else {
                    onMergeChangesRef.current?.(data)
                  }
                  setIsStreaming(false)
                  setStreamingAgent(null)
                },
                onError: (message) => {
                  throw new Error(message)
                },
              },
              diagramContext,
              conversationHistory,
              abortControllerRef.current.signal
            )

            setIsStreaming(false)
            abortControllerRef.current = null

            responseMessage = result?.message || 'Diagram generated successfully'
          } else {
            // Non-streaming mode (quick mode)
            responseMessage = await executeAIOperation(
              content,
              currentNodes,
              currentEdges,
              {
                onFullDiagram: onFullDiagramRef.current,
                onMergeChanges: onMergeChangesRef.current,
              },
              conversationHistory,
              aiMode
            )
          }
        }

        updateMessage(assistantMessageId, {
          content: formatAIMessage(responseMessage),
          status: 'complete',
        })

        setChatStatus('complete')

        setTimeout(() => {
          setChatStatus('idle')
        }, 1500)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Something went wrong'
        updateMessage(assistantMessageId, {
          content: errorMsg,
          status: 'error',
        })
        setChatStatus('error')

        // Reset streaming state on error
        setIsStreaming(false)
        setStreamingAgent(null)
        abortControllerRef.current = null

        setTimeout(() => {
          setChatStatus('idle')
        }, 3000)
      }
    },
    [
      addMessage,
      updateMessage,
      executeAIOperation,
      executeMindMapAIOperation,
      executeFlowchartAIOperation,
      currentNodes,
      currentEdges,
      currentMindMapData,
      currentFlowchartData,
      moduleType,
      aiMode,
      messages,
      onFullDiagramRef,
      onMergeChangesRef,
      onFullMindMapRef,
      onMindMapMergeChangesRef,
      onFullFlowchartRef,
      onCodeUpdateRef,
    ]
  )

  const clearMessages = useCallback(() => {
    setMessages([])

    if (projectId && diagramId) {
      // Clear from API
      chatApi.clearDiagramHistory(projectId, diagramId).catch((err) => {
        console.error('[useChatState] Failed to clear chat history from API:', err)
      })
    } else {
      // Clear from localStorage
      storageService.save(moduleType, CHAT_HISTORY_KEY, [])
    }
  }, [moduleType, projectId, diagramId])

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return {
    messages,
    chatStatus,
    unreadCount,
    sendTextMessage,
    clearMessages,
    resetUnreadCount,
    // Streaming state for thinking visualization
    isStreaming,
    streamingAgent,
    streamingContent,
    agentProgress,
  }
}

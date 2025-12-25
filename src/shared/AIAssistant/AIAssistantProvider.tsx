/**
 * AI Assistant Context Provider
 * Manages global state for Chat experience
 */

import {
  createContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import type { Node, Edge } from 'reactflow'
import type { OperationResponse, MergeData, ChatMessage, AIMode } from '../../types/ai'
import type { BaseNodeData } from '../../modules/diagrams/components/Nodes/BaseNode'
import type { MindElixirData } from 'mind-elixir'

import {
  useChatState,
  type ChatStatus,
  type ModuleType,
  type MindMapCallbacks,
  type FlowchartCallbacks,
  type FlowchartContext,
} from './hooks/useChatState'
import type { AgentName, AgentProgress } from '../../services/streamingApi'
import { storageService } from '../storage/storageService'

const AI_MODE_KEY = 'ai-mode'

type ActiveMode = 'none' | 'chat'

// Project context for persistence
interface ProjectContext {
  projectId: string | null
  diagramId: string | null
}

export interface AIAssistantContextValue {
  // UI Mode
  activeMode: ActiveMode
  openChat: () => void
  closePanel: () => void

  // Chat State
  messages: ChatMessage[]
  chatStatus: ChatStatus
  unreadCount: number

  // Streaming State for thinking visualization
  isStreaming: boolean
  streamingAgent: AgentName | null
  streamingContent: string
  agentProgress: AgentProgress[]

  // Chat Actions
  sendTextMessage: (content: string) => void
  clearMessages: () => void

  // Module type
  moduleType: ModuleType
  setModuleType: (type: ModuleType) => void

  // AI Mode
  aiMode: AIMode
  setAIMode: (mode: AIMode) => void

  // Project context (for API persistence)
  projectContext: ProjectContext
  setProjectContext: (context: ProjectContext) => void

  // Diagram references (set by parent) - for diagrams module
  currentNodes: Node<BaseNodeData>[]
  currentEdges: Edge[]
  setDiagramRefs: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void

  // Mind map data (set by parent) - for mindmap module
  currentMindMapData: MindElixirData | null
  setMindMapData: (data: MindElixirData | null) => void

  // Flowchart data (set by parent) - for flowchart module
  currentFlowchartData: FlowchartContext | null
  setFlowchartData: (data: FlowchartContext | null) => void

  // Callbacks (set by parent) - for diagrams module
  setCallbacks: (callbacks: {
    onFullDiagram: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void
    onMergeChanges: (changes: OperationResponse | MergeData) => void
  }) => void

  // Mind map callbacks (set by parent) - for mindmap module
  setMindMapCallbacks: (callbacks: MindMapCallbacks) => void

  // Flowchart callbacks (set by parent) - for flowchart module
  setFlowchartCallbacks: (callbacks: FlowchartCallbacks) => void
}

export const AIAssistantContext = createContext<AIAssistantContextValue | null>(null)

// Re-export hook from dedicated file for backwards compatibility
export { useAIAssistantContext } from './hooks/useAIAssistantContext'

interface AIAssistantProviderProps {
  children: ReactNode
}

export function AIAssistantProvider({ children }: AIAssistantProviderProps) {
  // UI Mode
  const [activeMode, setActiveMode] = useState<ActiveMode>('none')

  // Module type
  const [moduleType, setModuleType] = useState<ModuleType>('diagrams')

  // Project context (for API persistence)
  const [projectContext, setProjectContextState] = useState<ProjectContext>({
    projectId: null,
    diagramId: null,
  })

  const setProjectContext = useCallback((context: ProjectContext) => {
    setProjectContextState(context)
  }, [])

  // AI Mode (per module, with localStorage persistence)
  const [aiMode, setAIModeState] = useState<AIMode>(() => {
    const stored = storageService.load<AIMode>('diagrams', AI_MODE_KEY)
    return stored || 'advanced'
  })
  const prevModuleForModeRef = useRef<ModuleType>('diagrams')

  // Module data state
  const [currentNodes, setCurrentNodes] = useState<Node<BaseNodeData>[]>([])
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([])
  const [currentMindMapData, setCurrentMindMapData] = useState<MindElixirData | null>(null)
  const [currentFlowchartData, setCurrentFlowchartData] = useState<FlowchartContext | null>(null)

  // Callback refs for diagrams
  const onFullDiagramRef = useRef<((nodes: Node<BaseNodeData>[], edges: Edge[]) => void) | null>(null)
  const onMergeChangesRef = useRef<((changes: OperationResponse | MergeData) => void) | null>(null)

  // Callback refs for mind map
  const onFullMindMapRef = useRef<((data: MindElixirData) => void) | null>(null)
  const onMindMapMergeChangesRef = useRef<MindMapCallbacks['onMergeChanges'] | null>(null)

  // Callback refs for flowchart
  const onFullFlowchartRef = useRef<((code: string) => void) | null>(null)
  const onCodeUpdateRef = useRef<((code: string) => void) | null>(null)

  // Chat state hook
  const {
    messages,
    chatStatus,
    unreadCount,
    sendTextMessage,
    clearMessages,
    resetUnreadCount,
    // Streaming state
    isStreaming,
    streamingAgent,
    streamingContent,
    agentProgress,
  } = useChatState({
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
    // Project context for API persistence
    projectId: projectContext.projectId,
    diagramId: projectContext.diagramId,
  })

  // UI Actions
  const openChat = useCallback(() => {
    setActiveMode('chat')
    resetUnreadCount()
  }, [resetUnreadCount])

  const closePanel = useCallback(() => {
    setActiveMode('none')
  }, [])

  // AI Mode: handle module switching (load mode for new module)
  useEffect(() => {
    if (prevModuleForModeRef.current !== moduleType) {
      // Load mode for new module
      const stored = storageService.load<AIMode>(moduleType, AI_MODE_KEY)
      setAIModeState(stored || 'advanced')
      prevModuleForModeRef.current = moduleType
    }
  }, [moduleType])

  // AI Mode: setter with persistence
  const setAIMode = useCallback((mode: AIMode) => {
    setAIModeState(mode)
    storageService.save(moduleType, AI_MODE_KEY, mode)
  }, [moduleType])

  // Data setters
  const setDiagramRefs = useCallback(
    (nodes: Node<BaseNodeData>[], edges: Edge[]) => {
      setCurrentNodes(nodes)
      setCurrentEdges(edges)
    },
    []
  )

  const setMindMapData = useCallback((data: MindElixirData | null) => {
    setCurrentMindMapData(data)
  }, [])

  const setFlowchartData = useCallback((data: FlowchartContext | null) => {
    setCurrentFlowchartData(data)
  }, [])

  // Callback setters
  const setCallbacks = useCallback(
    (callbacks: {
      onFullDiagram: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void
      onMergeChanges: (changes: OperationResponse | MergeData) => void
    }) => {
      onFullDiagramRef.current = callbacks.onFullDiagram
      onMergeChangesRef.current = callbacks.onMergeChanges
    },
    []
  )

  const setMindMapCallbacks = useCallback((callbacks: MindMapCallbacks) => {
    onFullMindMapRef.current = callbacks.onFullMindMap
    onMindMapMergeChangesRef.current = callbacks.onMergeChanges
  }, [])

  const setFlowchartCallbacks = useCallback((callbacks: FlowchartCallbacks) => {
    onFullFlowchartRef.current = callbacks.onFullFlowchart
    onCodeUpdateRef.current = callbacks.onCodeUpdate
  }, [])

  const value: AIAssistantContextValue = {
    // UI Mode
    activeMode,
    openChat,
    closePanel,

    // Chat
    messages,
    chatStatus,
    unreadCount,

    // Streaming
    isStreaming,
    streamingAgent,
    streamingContent,
    agentProgress,

    // Actions
    sendTextMessage,
    clearMessages,

    // Module type
    moduleType,
    setModuleType,

    // AI Mode
    aiMode,
    setAIMode,

    // Project context
    projectContext,
    setProjectContext,

    // Diagram
    currentNodes,
    currentEdges,
    setDiagramRefs,

    // Mind map
    currentMindMapData,
    setMindMapData,

    // Flowchart
    currentFlowchartData,
    setFlowchartData,

    // Callbacks
    setCallbacks,
    setMindMapCallbacks,
    setFlowchartCallbacks,
  }

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  )
}

// Re-export types for convenience
export type { MindMapCallbacks, FlowchartCallbacks, FlowchartContext }

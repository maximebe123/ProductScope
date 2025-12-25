/**
 * Flowchart Page
 * Contains the Mermaid.js flowchart editor UI
 * Supports both project mode (PostgreSQL) and quick mode (localStorage)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Cloud, CloudOff } from 'lucide-react'

// Flowchart module components
import FlowchartCanvas from '../modules/flowchart/components/Canvas/FlowchartCanvas'
import FlowchartPalette from '../modules/flowchart/components/Sidebar/FlowchartPalette'

// Shared components
import {
  AIActionButtons,
  ChatSidebar,
  useAIAssistantContext,
} from '../shared/AIAssistant'

// Hooks
import { useFlowchartWorkflow } from '../modules/flowchart/hooks/useFlowchartWorkflow'
import { useStringAutoSave } from '../hooks/useModuleAutoSave'
import { useProjectDiagramGeneric } from '../hooks/useProjectDiagramGeneric'

const STORAGE_KEY = 'flowchart-autosave'

// Flowchart data stored in API
interface FlowchartAPIData {
  mermaidCode: string
  direction?: string
}

export function FlowchartPage() {
  const [isChatOpen, setIsChatOpen] = useState(true)
  const {
    mermaidCode,
    setCode,
    insertSnippet,
    undo,
    redo,
    canUndo,
    canRedo,
    getContext,
    loadFromAI,
  } = useFlowchartWorkflow()

  const handleChatToggle = useCallback(() => {
    setIsChatOpen(prev => !prev)
  }, [])

  // Track if initial restore has happened
  const initialRestoreRef = useRef(false)

  // Handler for restoring data (shared between project and local mode)
  const handleRestore = useCallback((code: string) => {
    if (!initialRestoreRef.current) {
      initialRestoreRef.current = true
      setCode(code)
    }
  }, [setCode])

  // Project mode (PostgreSQL) - check URL params
  const projectDiagram = useProjectDiagramGeneric<FlowchartAPIData>({
    data: mermaidCode ? { mermaidCode, direction: 'TB' } : null,
    onRestore: useCallback((data: FlowchartAPIData) => {
      if (data?.mermaidCode) {
        handleRestore(data.mermaidCode)
      }
    }, [handleRestore]),
    isEmpty: (data) => !data || !data.mermaidCode,
  })

  // Local auto-save (localStorage) - only when NOT in project mode
  const localAutoSave = useStringAutoSave(
    STORAGE_KEY,
    mermaidCode,
    handleRestore,
    !projectDiagram.isProjectMode
  )

  // Use project mode values when available, otherwise localStorage
  const lastSaved = projectDiagram.isProjectMode
    ? projectDiagram.lastSaved
    : localAutoSave.lastSaved

  // Handle code change (for AI callbacks)
  const handleCodeChange = useCallback(
    (code: string) => {
      setCode(code)
    },
    [setCode]
  )

  // AI Assistant context
  const { setModuleType, setFlowchartData, setFlowchartCallbacks, setProjectContext } = useAIAssistantContext()

  // Set module type to flowchart
  useEffect(() => {
    setModuleType('flowchart')
  }, [setModuleType])

  // Set project context for chat persistence
  useEffect(() => {
    setProjectContext({
      projectId: projectDiagram.projectId,
      diagramId: projectDiagram.diagramId,
    })
  }, [projectDiagram.projectId, projectDiagram.diagramId, setProjectContext])

  // Sync flowchart context to AI Assistant
  useEffect(() => {
    setFlowchartData?.(getContext())
  }, [mermaidCode, getContext, setFlowchartData])

  // Set up AI Assistant callbacks
  useEffect(() => {
    setFlowchartCallbacks?.({
      onFullFlowchart: loadFromAI,
      onCodeUpdate: handleCodeChange,
    })
  }, [loadFromAI, handleCodeChange, setFlowchartCallbacks])

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Project mode header */}
      {projectDiagram.isProjectMode && (
        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
          <Link
            to={`/projects/${projectDiagram.projectId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} />
            Back to project
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-sm font-medium text-gray-900">
            {projectDiagram.diagram?.name || 'Loading...'}
          </span>
          <div className="flex items-center gap-1.5 ml-auto text-xs text-gray-400">
            {projectDiagram.isSaving ? (
              <>
                <Cloud size={14} className="text-blue-500 animate-pulse" />
                <span>Saving...</span>
              </>
            ) : projectDiagram.hasUnsavedChanges ? (
              <>
                <CloudOff size={14} className="text-amber-500" />
                <span>Unsaved changes</span>
              </>
            ) : projectDiagram.lastSaved ? (
              <>
                <Cloud size={14} className="text-green-500" />
                <span>Saved to cloud</span>
              </>
            ) : null}
          </div>
          {projectDiagram.error && (
            <span className="text-xs text-red-500">{projectDiagram.error}</span>
          )}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar - Flowchart Palette */}
        <FlowchartPalette onInsertSnippet={insertSnippet} />

        {/* Main canvas area */}
        <div className="flex-1 relative min-w-0">
          <FlowchartCanvas
            mermaidCode={mermaidCode}
            onCodeChange={handleCodeChange}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            lastSaved={lastSaved}
            className="h-full w-full"
          />

          {/* AI Assistant floating elements */}
          <AIActionButtons showChatButton={false} />
        </div>

        {/* Right sidebar - Chat */}
        <ChatSidebar isOpen={isChatOpen} onToggle={handleChatToggle} />
      </div>
    </div>
  )
}

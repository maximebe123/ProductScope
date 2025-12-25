/**
 * Mind Map Page
 * Contains the mind map editor UI (MindElixir - native keyboard shortcuts)
 * Supports both project mode (PostgreSQL) and quick mode (localStorage)
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Cloud, CloudOff } from 'lucide-react'

// Mind map module components
import MindElixirCanvas from '../modules/mindmap/components/Canvas/MindElixirCanvas'
import MindMapPalette from '../modules/mindmap/components/Sidebar/MindMapPalette'

// Shared components
import {
  AIActionButtons,
  ChatSidebar,
  useAIAssistantContext,
} from '../shared/AIAssistant'

// Hooks
import { useMindMapWorkflow } from '../modules/mindmap/hooks/useMindMapWorkflow'
import { useModuleAutoSave } from '../hooks/useModuleAutoSave'
import { useProjectDiagramGeneric } from '../hooks/useProjectDiagramGeneric'

// Utils
import { migrateData } from '../modules/mindmap/utils/dataConverters'
import type { MindElixirData } from '../modules/mindmap/types/mindElixir'

const STORAGE_KEY = 'mindmap-autosave'

export function MindMapPage() {
  const [isChatOpen, setIsChatOpen] = useState(true)

  const {
    setInstance,
    handleDataChange,
    handleNodeSelect,
    data: mindMapData,
    loadData,
    mergeMindMapChanges,
    mindInstance,
  } = useMindMapWorkflow()

  const handleChatToggle = useCallback(() => {
    setIsChatOpen(prev => !prev)
    // Recenter mind map after sidebar animation
    setTimeout(() => {
      mindInstance?.scaleFit()
    }, 350)
  }, [mindInstance])

  // Initial data loaded from storage (only set once on mount)
  const [initialData, setInitialData] = useState<MindElixirData | null>(null)

  // Handler for restoring data (shared between project and local mode)
  const handleRestore = useCallback((data: MindElixirData) => {
    const migrated = migrateData(data)
    setInitialData(migrated)
  }, [])

  // Project mode (PostgreSQL) - check URL params
  const projectDiagram = useProjectDiagramGeneric<MindElixirData>({
    data: mindMapData,
    onRestore: handleRestore,
    isEmpty: (data) => !data,
  })

  // Local auto-save (localStorage) - only when NOT in project mode
  const localAutoSave = useModuleAutoSave<MindElixirData | null>({
    storageKey: STORAGE_KEY,
    data: mindMapData,
    onRestore: useCallback((data: MindElixirData | null) => {
      if (data) {
        handleRestore(data)
      }
    }, [handleRestore]),
    isEmpty: (data) => !data,
    enabled: !projectDiagram.isProjectMode,
  })

  // Use project mode values when available, otherwise localStorage
  const lastSaved = projectDiagram.isProjectMode
    ? projectDiagram.lastSaved
    : localAutoSave.lastSaved

  // Handle data change from canvas
  const handleDataChangeWithSave = useCallback(
    (data: MindElixirData) => {
      handleDataChange(data)
    },
    [handleDataChange]
  )

  // AI Assistant context
  const { setModuleType, setMindMapData, setMindMapCallbacks, setProjectContext } = useAIAssistantContext()

  // Set module type to mindmap
  useEffect(() => {
    setModuleType('mindmap')
  }, [setModuleType])

  // Set project context for chat persistence
  useEffect(() => {
    setProjectContext({
      projectId: projectDiagram.projectId,
      diagramId: projectDiagram.diagramId,
    })
  }, [projectDiagram.projectId, projectDiagram.diagramId, setProjectContext])

  // Sync mind map data to AI Assistant context
  useEffect(() => {
    setMindMapData(mindMapData)
  }, [mindMapData, setMindMapData])

  // Set up AI Assistant callbacks for mind map
  useEffect(() => {
    setMindMapCallbacks({
      onFullMindMap: loadData,
      onMergeChanges: mergeMindMapChanges,
    })
  }, [loadData, mergeMindMapChanges, setMindMapCallbacks])

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
        {/* Left sidebar - Mind Map Palette */}
        <MindMapPalette />

        {/* Main canvas area */}
        <div className="flex-1 relative min-w-0">
          <MindElixirCanvas
            initialData={initialData}
            onDataChange={handleDataChangeWithSave}
            onNodeSelect={handleNodeSelect}
            onInstanceReady={setInstance}
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

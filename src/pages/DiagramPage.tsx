/**
 * Diagram Page
 * Contains the main architecture diagram editor UI
 * Supports both project mode (PostgreSQL) and quick mode (localStorage)
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { ReactFlowInstance } from 'reactflow'
import { ArrowLeft, Cloud, CloudOff } from 'lucide-react'

// Diagram module components
import WorkflowCanvas from '../modules/diagrams/components/Canvas/WorkflowCanvas'
import NodePalette from '../modules/diagrams/components/Sidebar/NodePalette'

// Shared components
import {
  AIActionButtons,
  ChatSidebar,
  useAIAssistantContext,
} from '../shared/AIAssistant'
import NodePropertiesPanel from '../modules/diagrams/components/PropertiesPanel/NodePropertiesPanel'
import EdgePropertiesPanel from '../modules/diagrams/components/PropertiesPanel/EdgePropertiesPanel'

// Hooks
import { useWorkflow } from '../hooks/useWorkflow'
import { useAutoSave } from '../hooks/useAutoSave'
import { useProjectDiagram } from '../hooks/useProjectDiagram'

export function DiagramPage() {
  const [isChatOpen, setIsChatOpen] = useState(true)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  const handleChatToggle = useCallback(() => {
    setIsChatOpen(prev => !prev)
    // Recenter diagram after sidebar animation
    setTimeout(() => {
      reactFlowInstance.current?.fitView({ padding: 0.2, duration: 300 })
    }, 350)
  }, [])

  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    addNode,
    updateNodeLabel,
    addNodeTag,
    removeNodeTag,
    addVolume,
    removeVolume,
    toggleEdgeColorMode,
    updateEdgeLabel,
    deleteNode,
    deleteSelected,
    loadDiagram,
    createGroup,
    ungroup,
    addNodeToGroup,
    removeFromGroup,
    getGroups,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    selectAll,
    deselectAll,
    moveSelectedNodes,
    mergeDiagramChanges,
  } = useWorkflow()

  // Project mode (PostgreSQL) - check URL params
  const projectDiagram = useProjectDiagram({
    nodes,
    edges,
    onRestore: loadDiagram,
  })

  // Local auto-save (localStorage) - only when NOT in project mode
  const localAutoSave = useAutoSave({
    nodes,
    edges,
    onRestore: loadDiagram,
    enabled: !projectDiagram.isProjectMode,
  })

  // Use project mode values when available, otherwise localStorage
  const lastSaved = projectDiagram.isProjectMode
    ? projectDiagram.lastSaved
    : localAutoSave.lastSaved
  const hasUnsavedChanges = projectDiagram.isProjectMode
    ? projectDiagram.hasUnsavedChanges
    : localAutoSave.hasUnsavedChanges

  // AI Assistant context
  const { setModuleType, setDiagramRefs, setCallbacks, setProjectContext } = useAIAssistantContext()

  // Set module type to diagrams
  useEffect(() => {
    setModuleType('diagrams')
  }, [setModuleType])

  // Set project context for chat persistence
  useEffect(() => {
    setProjectContext({
      projectId: projectDiagram.projectId,
      diagramId: projectDiagram.diagramId,
    })
  }, [projectDiagram.projectId, projectDiagram.diagramId, setProjectContext])

  // Sync diagram refs to AI Assistant context
  useEffect(() => {
    setDiagramRefs(nodes, edges)
  }, [nodes, edges, setDiagramRefs])

  // Set up AI Assistant callbacks
  useEffect(() => {
    setCallbacks({
      onFullDiagram: loadDiagram,
      onMergeChanges: mergeDiagramChanges,
    })
  }, [loadDiagram, mergeDiagramChanges, setCallbacks])

  const handleCloseNodePanel = useCallback(() => {
    onNodesChange(
      nodes.map((node) => ({
        id: node.id,
        type: 'select' as const,
        selected: false,
      }))
    )
  }, [nodes, onNodesChange])

  const handleCloseEdgePanel = useCallback(() => {
    onEdgesChange(
      edges.map((edge) => ({
        id: edge.id,
        type: 'select' as const,
        selected: false,
      }))
    )
  }, [edges, onEdgesChange])

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
        {/* Left sidebar - Node Palette */}
        <NodePalette />

        {/* Main canvas area */}
        <div className="flex-1 relative min-w-0">
          <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          addNode={addNode}
          updateNodeLabel={updateNodeLabel}
          deleteSelected={deleteSelected}
          loadDiagram={loadDiagram}
          createGroup={createGroup}
          ungroup={ungroup}
          addNodeToGroup={addNodeToGroup}
          removeFromGroup={removeFromGroup}
          getGroups={getGroups}
          lastSaved={lastSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          copySelectedNodes={copySelectedNodes}
          pasteNodes={pasteNodes}
          duplicateSelectedNodes={duplicateSelectedNodes}
          selectAll={selectAll}
          deselectAll={deselectAll}
          moveSelectedNodes={moveSelectedNodes}
          onInstanceReady={(instance) => { reactFlowInstance.current = instance }}
        />

        {selectedNode && (
          <NodePropertiesPanel
            selectedNode={selectedNode}
            onUpdateLabel={updateNodeLabel}
            onAddTag={addNodeTag}
            onRemoveTag={removeNodeTag}
            onAddVolume={addVolume}
            onRemoveVolume={removeVolume}
            onDeleteNode={deleteNode}
            onClose={handleCloseNodePanel}
          />
        )}

        {selectedEdge && (
          <EdgePropertiesPanel
            selectedEdge={selectedEdge}
            onToggleColorMode={toggleEdgeColorMode}
            onUpdateLabel={updateEdgeLabel}
            onClose={handleCloseEdgePanel}
          />
        )}

          {/* AI Assistant floating elements */}
          <AIActionButtons showChatButton={false} />
        </div>

        {/* Right sidebar - Chat */}
        <ChatSidebar isOpen={isChatOpen} onToggle={handleChatToggle} />
      </div>
    </div>
  )
}

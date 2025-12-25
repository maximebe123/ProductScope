/**
 * Main AI Generator Panel with text input mode
 * Supports full generation and incremental CRUD operations
 */

import { useState, useCallback } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { Node, Edge } from 'reactflow'
import type { OperationResponse, MergeData } from '../../types/ai'
import type { BaseNodeData } from '../Nodes'
import { useAIGeneration } from '../../hooks/useAIGeneration'
import { TextInputMode } from './TextInputMode'
import { ConfirmReplaceDialog } from './ConfirmReplaceDialog'

interface AIGeneratorPanelProps {
  isOpen: boolean
  currentNodes: Node<BaseNodeData>[]
  currentEdges: Edge[]
  onClose: () => void
  onDiagramGenerated: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void
  onMergeChanges: (changes: OperationResponse | MergeData) => void
}

export function AIGeneratorPanel({
  isOpen,
  currentNodes,
  currentEdges,
  onClose,
  onDiagramGenerated,
  onMergeChanges,
}: AIGeneratorPanelProps) {
  const currentNodeCount = currentNodes.length
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingDiagram, setPendingDiagram] = useState<{
    nodes: Node<BaseNodeData>[]
    edges: Edge[]
  } | null>(null)

  // Text generation hook
  const {
    status: textStatus,
    error: textError,
    executeAIOperation,
    reset: resetText,
  } = useAIGeneration()

  // Handle full diagram generation result
  const handleFullDiagram = useCallback(
    (nodes: Node<BaseNodeData>[], edges: Edge[]) => {
      if (currentNodeCount > 0) {
        // Show confirmation dialog for full replacement
        setPendingDiagram({ nodes, edges })
        setShowConfirmDialog(true)
      } else {
        // No existing nodes, apply directly
        onDiagramGenerated(nodes, edges)
        onClose()
      }
    },
    [currentNodeCount, onDiagramGenerated, onClose]
  )

  // Handle incremental merge changes
  const handleMergeChanges = useCallback(
    (changes: OperationResponse | MergeData) => {
      // Apply merge changes directly (no confirmation needed)
      onMergeChanges(changes)
      // Don't close the panel for merge operations - user might want to continue
    },
    [onMergeChanges]
  )

  // Handle text generation
  const handleTextGenerate = useCallback(
    (description: string) => {
      executeAIOperation(description, currentNodes, currentEdges, {
        onFullDiagram: handleFullDiagram,
        onMergeChanges: handleMergeChanges,
      })
    },
    [executeAIOperation, currentNodes, currentEdges, handleFullDiagram, handleMergeChanges]
  )

  // Handle confirm replace
  const handleConfirmReplace = useCallback(() => {
    if (pendingDiagram) {
      onDiagramGenerated(pendingDiagram.nodes, pendingDiagram.edges)
      setPendingDiagram(null)
      setShowConfirmDialog(false)
      onClose()
    }
  }, [pendingDiagram, onDiagramGenerated, onClose])

  // Handle cancel replace
  const handleCancelReplace = useCallback(() => {
    setPendingDiagram(null)
    setShowConfirmDialog(false)
  }, [])

  // Handle close
  const handleClose = useCallback(() => {
    resetText()
    onClose()
  }, [resetText, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="text-primary" size={18} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI Diagram Generator
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <TextInputMode
              status={textStatus}
              error={textError}
              onGenerate={handleTextGenerate}
            />
          </div>
        </div>
      </div>

      {/* Confirm Replace Dialog */}
      <ConfirmReplaceDialog
        isOpen={showConfirmDialog}
        nodeCount={currentNodeCount}
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    </>
  )
}

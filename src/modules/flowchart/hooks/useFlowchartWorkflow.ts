/**
 * Flowchart Workflow Hook
 * Manages Mermaid code state, history, and operations
 */

import { useState, useCallback, useRef } from 'react'
import { DEFAULT_FLOWCHART_CODE, type FlowchartContext, type FlowchartNode, type FlowchartEdge } from '../types/flowchart'
import { parseMermaidCode, extractFlowchartContext } from '../utils/mermaidParser'

const MAX_HISTORY_SIZE = 50

interface UseFlowchartWorkflowResult {
  // State
  mermaidCode: string
  setCode: (code: string) => void
  insertSnippet: (snippet: string) => void

  // Derived
  parsedNodes: FlowchartNode[]
  parsedEdges: FlowchartEdge[]

  // History
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  // Context for AI
  getContext: () => FlowchartContext

  // AI operations
  loadFromAI: (code: string) => void
}

export function useFlowchartWorkflow(): UseFlowchartWorkflowResult {
  const [mermaidCode, setMermaidCode] = useState(DEFAULT_FLOWCHART_CODE)
  const [history, setHistory] = useState<string[]>([DEFAULT_FLOWCHART_CODE])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUndoRedoRef = useRef(false)

  // Update code with history tracking
  const setCode = useCallback((code: string) => {
    setMermaidCode(code)

    // Skip history if this is an undo/redo operation
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }

    setHistory((prev) => {
      // Remove any redo history
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(code)

      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
        return newHistory
      }

      return newHistory
    })

    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1))
  }, [historyIndex])

  // Insert snippet at end of code
  const insertSnippet = useCallback((snippet: string) => {
    setCode(mermaidCode + '\n' + snippet)
  }, [mermaidCode, setCode])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setMermaidCode(history[newIndex])
    }
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setMermaidCode(history[newIndex])
    }
  }, [history, historyIndex])

  // Parse current code
  const { nodes: parsedNodes, edges: parsedEdges } = parseMermaidCode(mermaidCode)

  // Get context for AI
  const getContext = useCallback((): FlowchartContext => {
    return extractFlowchartContext(mermaidCode)
  }, [mermaidCode])

  // Load code from AI
  const loadFromAI = useCallback((code: string) => {
    setCode(code)
  }, [setCode])

  return {
    mermaidCode,
    setCode,
    insertSnippet,
    parsedNodes,
    parsedEdges,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    getContext,
    loadFromAI,
  }
}

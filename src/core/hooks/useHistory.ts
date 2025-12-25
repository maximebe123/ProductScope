import { useCallback, useRef, useState } from 'react'
import { Node, Edge } from 'reactflow'
import { HistoryState, HistoryConfig, UseHistoryReturn } from '../types/canvas'

const DEFAULT_MAX_HISTORY_SIZE = 50

/**
 * Deep clone state for history snapshots
 */
const cloneState = <TNode, TEdge>(
  nodes: TNode[],
  edges: TEdge[]
): HistoryState<TNode, TEdge> => ({
  nodes: JSON.parse(JSON.stringify(nodes)),
  edges: JSON.parse(JSON.stringify(edges)),
})

/**
 * Generic undo/redo hook for canvas state management
 *
 * @param nodes - Current nodes state
 * @param edges - Current edges state
 * @param setNodes - Function to update nodes
 * @param setEdges - Function to update edges
 * @param config - Optional configuration
 * @returns History operations and state
 *
 * @example
 * ```tsx
 * const [nodes, setNodes] = useNodesState([])
 * const [edges, setEdges] = useEdgesState([])
 *
 * const { pushToHistory, undo, redo, canUndo, canRedo } = useHistory(
 *   nodes,
 *   edges,
 *   setNodes,
 *   setEdges
 * )
 *
 * // Before making changes, push current state to history
 * const addNode = () => {
 *   pushToHistory()
 *   setNodes([...nodes, newNode])
 * }
 * ```
 */
export function useHistory<
  TNode extends Node = Node,
  TEdge extends Edge = Edge
>(
  nodes: TNode[],
  edges: TEdge[],
  setNodes: React.Dispatch<React.SetStateAction<TNode[]>>,
  setEdges: React.Dispatch<React.SetStateAction<TEdge[]>>,
  config: HistoryConfig = {}
): UseHistoryReturn & {
  isUndoRedo: () => boolean
} {
  const maxSize = config.maxSize ?? DEFAULT_MAX_HISTORY_SIZE

  // History stacks stored in refs to avoid re-renders
  const pastRef = useRef<HistoryState<TNode, TEdge>[]>([])
  const futureRef = useRef<HistoryState<TNode, TEdge>[]>([])

  // Force re-render when history changes (for canUndo/canRedo)
  const [, setHistoryVersion] = useState(0)

  // Flag to prevent saving during undo/redo operations
  const isUndoRedoRef = useRef(false)

  /**
   * Push current state to history before making changes
   * Call this BEFORE modifying nodes/edges
   */
  const pushToHistory = useCallback(() => {
    if (isUndoRedoRef.current) return

    pastRef.current = [...pastRef.current, cloneState(nodes, edges)]

    // Limit history size
    if (pastRef.current.length > maxSize) {
      pastRef.current = pastRef.current.slice(-maxSize)
    }

    // Clear future on new action
    futureRef.current = []
    setHistoryVersion((v) => v + 1)
  }, [nodes, edges, maxSize])

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return

    isUndoRedoRef.current = true

    // Save current state to future
    const currentState = cloneState(nodes, edges)
    futureRef.current = [currentState, ...futureRef.current]

    // Restore previous state
    const previousState = pastRef.current[pastRef.current.length - 1]
    pastRef.current = pastRef.current.slice(0, -1)

    setNodes(previousState.nodes)
    setEdges(previousState.edges)
    setHistoryVersion((v) => v + 1)

    // Reset flag after tick to allow next operations
    setTimeout(() => {
      isUndoRedoRef.current = false
    }, 0)
  }, [nodes, edges, setNodes, setEdges])

  /**
   * Redo previously undone action
   */
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return

    isUndoRedoRef.current = true

    // Save current state to past
    const currentState = cloneState(nodes, edges)
    pastRef.current = [...pastRef.current, currentState]

    // Restore next state
    const nextState = futureRef.current[0]
    futureRef.current = futureRef.current.slice(1)

    setNodes(nextState.nodes)
    setEdges(nextState.edges)
    setHistoryVersion((v) => v + 1)

    // Reset flag after tick
    setTimeout(() => {
      isUndoRedoRef.current = false
    }, 0)
  }, [nodes, edges, setNodes, setEdges])

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
    setHistoryVersion((v) => v + 1)
  }, [])

  /**
   * Check if currently in undo/redo operation
   * Useful for skipping auto-save during undo/redo
   */
  const isUndoRedo = useCallback(() => isUndoRedoRef.current, [])

  return {
    pushToHistory,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    clearHistory,
    isUndoRedo,
  }
}

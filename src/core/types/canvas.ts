import { Node, Edge } from 'reactflow'

/**
 * Generic history state for undo/redo operations
 * Used by useHistory hook
 */
export interface HistoryState<TNode = Node, TEdge = Edge> {
  nodes: TNode[]
  edges: TEdge[]
}

/**
 * Generic item that can exist on a canvas
 * Must have an id and position for basic canvas operations
 */
export interface CanvasItem {
  id: string
  position: { x: number; y: number }
  selected?: boolean
}

/**
 * Selection state for canvas items
 * Tracks currently selected nodes and edges
 */
export interface SelectionState<TNode extends CanvasItem, TEdge extends { id: string }> {
  selectedNodes: TNode[]
  selectedEdge: TEdge | null
}

/**
 * Clipboard state for copy/paste operations
 */
export interface ClipboardState<T> {
  items: T[]
  hasContent: boolean
}

/**
 * History hook return type
 */
export interface UseHistoryReturn {
  pushToHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  clearHistory: () => void
}

/**
 * Clipboard hook return type
 */
export interface UseClipboardReturn<T extends CanvasItem> {
  clipboard: T[]
  hasClipboard: boolean
  copyItems: (items: T[]) => void
  pasteItems: (offset?: { x: number; y: number }) => T[]
  clearClipboard: () => void
}

/**
 * Selection hook return type
 */
export interface UseSelectionReturn<TNode extends CanvasItem, TEdge extends { id: string }> {
  selectedNode: TNode | null
  selectedEdge: TEdge | null
  setSelectedNode: (node: TNode | null) => void
  setSelectedEdge: (edge: TEdge | null) => void
  onSelectionChange: (selection: { nodes: TNode[]; edges: TEdge[] }) => void
}

/**
 * Configuration for history hook
 */
export interface HistoryConfig {
  maxSize?: number
}

/**
 * Configuration for clipboard hook
 */
export interface ClipboardConfig {
  defaultOffset?: { x: number; y: number }
}

import { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect } from 'reactflow'
import { LucideIcon } from 'lucide-react'

/**
 * Base module definition - describes a complete module that can be registered.
 * Uses permissive types to support different module implementations.
 *
 * Each module can have its own Canvas props and workflow interface,
 * so we use flexible types here that accept any implementation.
 */
export interface ModuleDefinition {
  /** Unique identifier for the module */
  id: string

  /** Display name */
  name: string

  /** Short description */
  description: string

  /** Icon component for sidebar/navigation */
  icon: LucideIcon

  /** Route path (e.g., '/diagrams', '/mindmap') */
  route: string

  /** Version string */
  version: string

  /** Main canvas component - each module defines its own props */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Canvas: React.ComponentType<any>

  /** Optional sidebar component - each module defines its own props */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Sidebar?: React.ComponentType<any>

  /** Optional properties panel component */
  PropertiesPanel?: React.ComponentType<ModulePropertiesPanelProps>

  /** Optional toolbar component */
  Toolbar?: React.ComponentType

  /** Hook that returns the module's workflow state and operations */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useWorkflow: () => any

  /** Supported export formats */
  exportFormats?: ExportFormat[]
}

/**
 * Props passed to module canvas components
 */
export interface ModuleCanvasProps {
  /** Workflow state and operations from useWorkflow hook */
  workflow: ModuleWorkflow

  /** Optional className for styling */
  className?: string
}

/**
 * Props for properties panel components
 */
export interface ModulePropertiesPanelProps {
  /** Currently selected item (node or edge) */
  selection: unknown

  /** Callback to close the panel */
  onClose: () => void
}

/**
 * Base workflow interface that all modules should implement.
 * Provides a consistent API for the shell/app to interact with modules.
 * Modules can extend this with additional operations via the index signature.
 */
export interface BaseModuleWorkflow {
  // ============================================
  // Core State (required)
  // ============================================

  /** Current nodes in the canvas */
  nodes: Node[]

  /** Current edges in the canvas */
  edges: Edge[]

  /** Currently selected node (for properties panel) */
  selectedNode: Node | null

  /** Currently selected edge (for properties panel) */
  selectedEdge: Edge | null

  // ============================================
  // ReactFlow Handlers (required)
  // ============================================

  /** Handler for node changes (position, selection, etc.) */
  onNodesChange: OnNodesChange

  /** Handler for edge changes */
  onEdgesChange: OnEdgesChange

  /** Handler for new connections */
  onConnect: OnConnect

  /** Handler for selection changes */
  onSelectionChange: (selection: { nodes: Node[]; edges: Edge[] }) => void

  // ============================================
  // History Operations (required)
  // ============================================

  /** Undo last action */
  undo: () => void

  /** Redo previously undone action */
  redo: () => void

  /** Whether undo is available */
  canUndo: boolean

  /** Whether redo is available */
  canRedo: boolean

  // ============================================
  // Clipboard Operations (required)
  // ============================================

  /** Copy selected nodes to clipboard */
  copySelectedNodes: () => void

  /** Paste nodes from clipboard */
  pasteNodes: () => void

  /** Duplicate selected nodes */
  duplicateSelectedNodes: () => void

  /** Whether clipboard has content */
  hasClipboard: boolean

  // ============================================
  // Selection Operations (required)
  // ============================================

  /** Select all nodes */
  selectAll: () => void

  /** Deselect all nodes and edges */
  deselectAll: () => void

  /** Delete selected nodes and edges */
  deleteSelected: () => void

  // ============================================
  // Load/Save Operations (required)
  // ============================================

  /** Load a diagram from data */
  loadDiagram: (nodes: Node[], edges: Edge[]) => void

  // ============================================
  // Module-specific operations (optional)
  // Modules can extend this interface with additional operations
  // ============================================

  [key: string]: unknown
}

/**
 * Export format configuration
 */
export interface ExportFormat {
  /** Format identifier */
  id: string

  /** Display name */
  name: string

  /** File extension */
  extension: string

  /** MIME type */
  mimeType: string
}

/**
 * Module registration options
 */
export interface ModuleRegistrationOptions {
  /** Whether this is the default module */
  isDefault?: boolean
}

/**
 * Module context value provided to components
 */
export interface ModuleContextValue {
  /** Currently active module */
  activeModule: ModuleDefinition

  /** Switch to a different module */
  switchModule: (moduleId: string) => void

  /** List of all available modules */
  availableModules: ModuleDefinition[]
}

/**
 * Alias for backward compatibility
 * @deprecated Use BaseModuleWorkflow instead
 */
export type ModuleWorkflow = BaseModuleWorkflow

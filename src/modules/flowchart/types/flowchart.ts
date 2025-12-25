/**
 * Flowchart Module Types
 */

export interface FlowchartNode {
  id: string
  label: string
  nodeType: FlowchartNodeType
  subgraph?: string
}

export interface FlowchartEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface FlowchartSubgraph {
  id: string
  label: string
}

export interface FlowchartContext {
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
  subgraphs: FlowchartSubgraph[]
  direction: FlowchartDirection
  mermaidCode: string
}

export type FlowchartDirection = 'TB' | 'TD' | 'BT' | 'LR' | 'RL'

export type FlowchartNodeType =
  // Basic shapes
  | 'start_end'
  | 'process'
  | 'decision'
  | 'data'
  | 'database'
  // Geometric shapes
  | 'hexagon'
  | 'trapezoid'
  | 'trapezoid_alt'
  | 'parallelogram_alt'
  | 'double_circle'
  | 'asymmetric'
  | 'display'
  // Documents
  | 'document'
  | 'documents'
  | 'lined_doc'
  | 'manual_file'
  | 'card'
  | 'paper_tape'
  // Control flow
  | 'subprocess'
  | 'connector'
  | 'parallel'
  | 'loop'
  | 'junction'
  | 'cross'
  // Advanced
  | 'comment'
  | 'error'
  | 'timer'
  | 'manual'
  | 'delay'
  | 'processes'
  | 'disk_storage'
  | 'manual_input'

export interface FlowchartWorkflow {
  // Source of truth
  mermaidCode: string
  setCode: (code: string) => void
  insertSnippet: (snippet: string) => void

  // Derived state
  parsedNodes: FlowchartNode[]
  parsedEdges: FlowchartEdge[]
  syntaxErrors: string[]

  // History
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  // Export
  getSvgElement: () => SVGElement | null
  exportPng: () => Promise<Blob | null>
  exportSvg: () => Blob | null
  exportMermaidCode: () => string

  // AI
  getContext: () => FlowchartContext
  loadFromAI: (code: string) => void
}

export type NodeSnippetCategory = 'basic' | 'shapes' | 'documents' | 'control' | 'advanced' | 'container'

export interface NodeSnippet {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  syntax: string
  description: string
  category: NodeSnippetCategory
}

export const DEFAULT_FLOWCHART_CODE = `flowchart TB
    A([Start]) --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action]
    C -->|No| E[Other Action]
    D --> F([End])
    E --> F
`

/**
 * Diagrams Module
 * Visual architecture diagram editor
 */

import type { ModuleDefinition } from '../../core/types/module'
import { Layers } from 'lucide-react'

// Lazy load components to enable code splitting
import WorkflowCanvas from './components/Canvas/WorkflowCanvas'
import NodePalette from './components/Sidebar/NodePalette'

// Import the workflow hook
import { useWorkflow } from '../../hooks/useWorkflow'

/**
 * Diagram Module Definition
 */
export const DiagramModule: ModuleDefinition = {
  id: 'diagrams',
  name: 'Architecture Diagrams',
  description: 'Visual architecture diagram editor with drag-and-drop nodes',
  icon: Layers,
  route: '/diagrams',
  version: '1.0.0',

  // Components
  Canvas: WorkflowCanvas,
  Sidebar: NodePalette,

  // Workflow hook
  useWorkflow,

  // Export formats
  exportFormats: [
    { id: 'json', name: 'JSON', extension: 'json', mimeType: 'application/json' },
    { id: 'png', name: 'PNG Image', extension: 'png', mimeType: 'image/png' },
    { id: 'svg', name: 'SVG Vector', extension: 'svg', mimeType: 'image/svg+xml' },
    { id: 'md', name: 'Markdown', extension: 'md', mimeType: 'text/markdown' },
  ],
}

// Re-export types and components for direct access
export * from './config/nodeConfig'
export { default as WorkflowCanvas } from './components/Canvas/WorkflowCanvas'
export { default as NodePalette } from './components/Sidebar/NodePalette'
export { default as BaseNode, type BaseNodeData, type VolumeAttachment } from './components/Nodes/BaseNode'
export { default as GroupNode, type GroupNodeData } from './components/Nodes/GroupNode'
export { default as CustomEdge } from './components/Edges/CustomEdge'

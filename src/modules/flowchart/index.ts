/**
 * Flowchart Module
 * Mermaid.js-based flowchart editor
 */

import type { ModuleDefinition } from '../../core/types/module'
import { GitBranch } from 'lucide-react'

// Components
import FlowchartCanvas from './components/Canvas/FlowchartCanvas'
import FlowchartPalette from './components/Sidebar/FlowchartPalette'

// Hooks
import { useFlowchartWorkflow } from './hooks/useFlowchartWorkflow'

/**
 * Flowchart Module Definition
 */
export const FlowchartModule: ModuleDefinition = {
  id: 'flowchart',
  name: 'Flowcharts',
  description: 'Mermaid.js flowchart editor',
  icon: GitBranch,
  route: '/flowchart',
  version: '1.0.0',

  // Components
  Canvas: FlowchartCanvas,
  Sidebar: FlowchartPalette,

  // Workflow hook
  useWorkflow: useFlowchartWorkflow,

  // Export formats
  exportFormats: [
    { id: 'mermaid', name: 'Mermaid Code', extension: 'mmd', mimeType: 'text/plain' },
    { id: 'png', name: 'PNG Image', extension: 'png', mimeType: 'image/png' },
    { id: 'svg', name: 'SVG Vector', extension: 'svg', mimeType: 'image/svg+xml' },
  ],
}

// Re-export types and components
export * from './config/nodeConfig'
export * from './types/flowchart'
export { default as FlowchartCanvas } from './components/Canvas/FlowchartCanvas'
export { default as FlowchartPalette } from './components/Sidebar/FlowchartPalette'
export { useFlowchartWorkflow } from './hooks/useFlowchartWorkflow'

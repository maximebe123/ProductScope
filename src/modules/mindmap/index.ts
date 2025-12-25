/**
 * Mind Map Module
 * Visual brainstorming and idea mapping
 */

import type { ModuleDefinition } from '../../core/types/module'
import { Brain } from 'lucide-react'

// Components
import MindElixirCanvas from './components/Canvas/MindElixirCanvas'
import MindMapPalette from './components/Sidebar/MindMapPalette'

// Hooks
import { useMindMapWorkflow } from './hooks/useMindMapWorkflow'

/**
 * Mind Map Module Definition
 */
export const MindMapModule: ModuleDefinition = {
  id: 'mindmap',
  name: 'Mind Mapping',
  description: 'Visual brainstorming and idea mapping',
  icon: Brain,
  route: '/mindmap',
  version: '1.0.0',

  // Components
  Canvas: MindElixirCanvas,
  Sidebar: MindMapPalette,

  // Workflow hook
  useWorkflow: useMindMapWorkflow,

  // Export formats
  exportFormats: [
    { id: 'json', name: 'JSON', extension: 'json', mimeType: 'application/json' },
    { id: 'png', name: 'PNG Image', extension: 'png', mimeType: 'image/png' },
    { id: 'svg', name: 'SVG Vector', extension: 'svg', mimeType: 'image/svg+xml' },
  ],
}

// Re-export types and components
export * from './config/nodeConfig'
export * from './types/mindmap'
export * from './types/mindElixir'
export { default as MindElixirCanvas } from './components/Canvas/MindElixirCanvas'
export { default as MindMapPalette } from './components/Sidebar/MindMapPalette'
export { useMindMapWorkflow } from './hooks/useMindMapWorkflow'

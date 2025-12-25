/**
 * Mind Map Node Configuration (Simplified)
 * 3 node types only: topic, branch, note
 */

import { Circle, GitBranch, StickyNote, LucideIcon } from 'lucide-react'

// Node type IDs - simplified to 3 types
export type MindMapNodeTypeId = 'topic' | 'branch' | 'note'

export interface MindMapNodeTypeConfig {
  id: MindMapNodeTypeId
  label: string
  icon: LucideIcon
  description: string
  defaultLabel: string
  // Styling
  color: string
  bgColor: string
  textColor: string
}

export const nodeTypes: Record<MindMapNodeTypeId, MindMapNodeTypeConfig> = {
  topic: {
    id: 'topic',
    label: 'Topic Central',
    icon: Circle,
    description: 'Central theme of the mind map',
    defaultLabel: 'Central Topic',
    color: '#0230a8',
    bgColor: '#0230a8',
    textColor: '#ffffff',
  },
  branch: {
    id: 'branch',
    label: 'Branch',
    icon: GitBranch,
    description: 'Main ideas and sub-ideas',
    defaultLabel: 'Branch',
    color: '#6366f1',
    bgColor: '#eef2ff',
    textColor: '#4338ca',
  },
  note: {
    id: 'note',
    label: 'Note',
    icon: StickyNote,
    description: 'Additional annotation',
    defaultLabel: 'Note',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    textColor: '#b45309',
  },
}

// Get node type config
export const getNodeType = (nodeTypeId: MindMapNodeTypeId): MindMapNodeTypeConfig => {
  return nodeTypes[nodeTypeId]
}

// All node type IDs
export const nodeTypeIds: MindMapNodeTypeId[] = ['topic', 'branch', 'note']

/**
 * Flowchart Node Snippets Configuration
 */

import {
  Circle,
  Square,
  Diamond,
  Layers,
  CircleDot,
  GitFork,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  Clock,
  Hand,
  Database,
  Workflow,
  // Geometric shapes
  Hexagon,
  Milestone,
  Flag,
  Monitor,
  // Documents
  FileText,
  Files,
  FileCog,
  CreditCard,
  Scroll,
  FileInput,
  // Control flow
  Merge,
  X,
  // Advanced
  Timer,
  Layers3,
  HardDrive,
  PenLine,
} from 'lucide-react'
import type { NodeSnippet } from '../types/flowchart'

export const NODE_SNIPPETS: NodeSnippet[] = [
  // ===== BASIC SHAPES =====
  {
    id: 'start_end',
    label: 'Start/End',
    icon: Circle,
    syntax: '([Label])',
    description: 'Stadium shape for start/end points',
    category: 'basic',
  },
  {
    id: 'process',
    label: 'Process',
    icon: Square,
    syntax: '[Label]',
    description: 'Rectangle for process steps',
    category: 'basic',
  },
  {
    id: 'decision',
    label: 'Decision',
    icon: Diamond,
    syntax: '{Label}',
    description: 'Diamond for decisions',
    category: 'basic',
  },
  {
    id: 'data',
    label: 'Data',
    icon: Workflow,
    syntax: '[/Label/]',
    description: 'Parallelogram for data I/O',
    category: 'basic',
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    syntax: '[(Label)]',
    description: 'Cylinder for database',
    category: 'basic',
  },

  // ===== GEOMETRIC SHAPES =====
  {
    id: 'hexagon',
    label: 'Hexagon',
    icon: Hexagon,
    syntax: '{{Label}}',
    description: 'Preparation/condition',
    category: 'shapes',
  },
  {
    id: 'trapezoid',
    label: 'Trapezoid',
    icon: Milestone,
    syntax: '[/Label\\]',
    description: 'Manual operation variant',
    category: 'shapes',
  },
  {
    id: 'trapezoid_alt',
    label: 'Trapezoid Alt',
    icon: Milestone,
    syntax: '[\\Label/]',
    description: 'Inverted trapezoid',
    category: 'shapes',
  },
  {
    id: 'parallelogram_alt',
    label: 'Para. Alt',
    icon: Workflow,
    syntax: '[\\Label\\]',
    description: 'Alternative parallelogram',
    category: 'shapes',
  },
  {
    id: 'double_circle',
    label: 'Double Circle',
    icon: CircleDot,
    syntax: '(((Label)))',
    description: 'Stop/end variant',
    category: 'shapes',
  },
  {
    id: 'asymmetric',
    label: 'Flag/Banner',
    icon: Flag,
    syntax: '>Label]',
    description: 'Asymmetric shape',
    category: 'shapes',
  },
  {
    id: 'display',
    label: 'Display',
    icon: Monitor,
    syntax: '@{ shape: curv-trap, label: "Label" }',
    description: 'Display output',
    category: 'shapes',
  },

  // ===== DOCUMENTS =====
  {
    id: 'document',
    label: 'Document',
    icon: FileText,
    syntax: '@{ shape: doc, label: "Label" }',
    description: 'Single document',
    category: 'documents',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: Files,
    syntax: '@{ shape: docs, label: "Label" }',
    description: 'Multiple documents',
    category: 'documents',
  },
  {
    id: 'lined_doc',
    label: 'Lined Doc',
    icon: FileInput,
    syntax: '@{ shape: lin-doc, label: "Label" }',
    description: 'Lined document',
    category: 'documents',
  },
  {
    id: 'manual_file',
    label: 'Manual File',
    icon: FileCog,
    syntax: '@{ shape: manual-file, label: "Label" }',
    description: 'File handling',
    category: 'documents',
  },
  {
    id: 'card',
    label: 'Card',
    icon: CreditCard,
    syntax: '@{ shape: card, label: "Label" }',
    description: 'Punched card',
    category: 'documents',
  },
  {
    id: 'paper_tape',
    label: 'Paper Tape',
    icon: Scroll,
    syntax: '@{ shape: paper-tape, label: "Label" }',
    description: 'Paper records',
    category: 'documents',
  },

  // ===== CONTROL FLOW =====
  {
    id: 'subprocess',
    label: 'Subprocess',
    icon: Layers,
    syntax: '[[Label]]',
    description: 'Subroutine/subprocess',
    category: 'control',
  },
  {
    id: 'connector',
    label: 'Connector',
    icon: CircleDot,
    syntax: '((Label))',
    description: 'Circle connector',
    category: 'control',
  },
  {
    id: 'parallel',
    label: 'Fork/Join',
    icon: GitFork,
    syntax: '@{ shape: fork, label: "Fork" }',
    description: 'Parallel gateway',
    category: 'control',
  },
  {
    id: 'loop',
    label: 'Loop',
    icon: RefreshCw,
    syntax: '@{ shape: lean-r, label: "Loop" }',
    description: 'Loop marker',
    category: 'control',
  },
  {
    id: 'junction',
    label: 'Junction',
    icon: Merge,
    syntax: '@{ shape: f-circ, label: "Label" }',
    description: 'Junction point',
    category: 'control',
  },
  {
    id: 'cross',
    label: 'Cross',
    icon: X,
    syntax: '@{ shape: cross, label: "Label" }',
    description: 'Intersection',
    category: 'control',
  },

  // ===== ADVANCED =====
  {
    id: 'comment',
    label: 'Comment',
    icon: MessageSquare,
    syntax: '@{ shape: braces, label: "Note" }',
    description: 'Annotation/comment',
    category: 'advanced',
  },
  {
    id: 'error',
    label: 'Error',
    icon: AlertTriangle,
    syntax: '@{ shape: bolt, label: "Error" }',
    description: 'Error/exception',
    category: 'advanced',
  },
  {
    id: 'timer',
    label: 'Timer',
    icon: Clock,
    syntax: '@{ shape: hourglass, label: "Wait" }',
    description: 'Timer/delay',
    category: 'advanced',
  },
  {
    id: 'manual',
    label: 'Manual',
    icon: Hand,
    syntax: '@{ shape: trap-t, label: "Input" }',
    description: 'Manual operation',
    category: 'advanced',
  },
  {
    id: 'delay',
    label: 'Delay',
    icon: Timer,
    syntax: '@{ shape: delay, label: "Label" }',
    description: 'Delay/wait',
    category: 'advanced',
  },
  {
    id: 'processes',
    label: 'Multi-Process',
    icon: Layers3,
    syntax: '@{ shape: processes, label: "Label" }',
    description: 'Multiple processes',
    category: 'advanced',
  },
  {
    id: 'disk_storage',
    label: 'Disk Storage',
    icon: HardDrive,
    syntax: '@{ shape: lin-cyl, label: "Label" }',
    description: 'Disk drive',
    category: 'advanced',
  },
  {
    id: 'manual_input',
    label: 'Manual Input',
    icon: PenLine,
    syntax: '@{ shape: manual-input, label: "Label" }',
    description: 'Manual user input',
    category: 'advanced',
  },
]

export const SUBGRAPH_SNIPPET = `subgraph "Group Name"
    node1[Step 1]
    node2[Step 2]
end`

export const EDGE_SNIPPETS = [
  { label: 'Arrow', syntax: '-->' },
  { label: 'Arrow with text', syntax: '-->|text|' },
  { label: 'Line', syntax: '---' },
  { label: 'Dotted', syntax: '-.->' },
  { label: 'Thick', syntax: '==>' },
]

export const DIRECTION_OPTIONS = [
  { value: 'TB', label: 'Top to Bottom' },
  { value: 'TD', label: 'Top Down' },
  { value: 'BT', label: 'Bottom to Top' },
  { value: 'LR', label: 'Left to Right' },
  { value: 'RL', label: 'Right to Left' },
]

export const SNIPPET_CATEGORIES = [
  { id: 'basic', label: 'Basic Shapes' },
  { id: 'shapes', label: 'Geometric Shapes' },
  { id: 'documents', label: 'Documents' },
  { id: 'control', label: 'Control Flow' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'container', label: 'Containers' },
]

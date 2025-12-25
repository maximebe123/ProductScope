/**
 * Shared constants for project workspace
 */

import { Network, Brain, GitBranch, Map, FileText } from 'lucide-react'
import type { DiagramType, StoryStatus, QuestionStatus, DecisionStatus } from '../../services/projectApi'

export const DIAGRAM_TYPE_META: Record<DiagramType, { icon: typeof Network; label: string; color: string }> = {
  architecture: { icon: Network, label: 'Architecture', color: 'text-primary' },
  mindmap: { icon: Brain, label: 'Mind Map', color: 'text-purple-600' },
  flowchart: { icon: GitBranch, label: 'Flowchart', color: 'text-green-600' },
  journey: { icon: Map, label: 'User Journey', color: 'text-orange-600' },
  storymap: { icon: FileText, label: 'Story Map', color: 'text-cyan-600' },
}

/**
 * Story status metadata for display
 */
export const STORY_STATUS_META: Record<StoryStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-500', bg: 'bg-gray-100' },
  ready: { label: 'Ready', color: 'text-gray-600', bg: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-gray-600', bg: 'bg-gray-100' },
  done: { label: 'Done', color: 'text-gray-600', bg: 'bg-gray-100' },
  rejected: { label: 'Rejected', color: 'text-gray-500', bg: 'bg-gray-100' },
}

/**
 * Question status metadata for display
 */
export const QUESTION_STATUS_META: Record<QuestionStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-gray-600', bg: 'bg-gray-100' },
  answered: { label: 'Answered', color: 'text-gray-600', bg: 'bg-gray-100' },
  deferred: { label: 'Deferred', color: 'text-gray-500', bg: 'bg-gray-100' },
  closed: { label: 'Closed', color: 'text-gray-500', bg: 'bg-gray-100' },
}

/**
 * Decision status metadata for display
 */
export const DECISION_STATUS_META: Record<DecisionStatus, { label: string; color: string; bg: string }> = {
  proposed: { label: 'Proposed', color: 'text-gray-600', bg: 'bg-gray-100' },
  approved: { label: 'Approved', color: 'text-gray-600', bg: 'bg-gray-100' },
  rejected: { label: 'Rejected', color: 'text-gray-500', bg: 'bg-gray-100' },
  superseded: { label: 'Superseded', color: 'text-gray-500', bg: 'bg-gray-100' },
}

/**
 * Get the route for a diagram based on its type
 */
export function getDiagramRoute(diagramType: DiagramType, projectId: string, diagramId: string): string {
  const routes: Record<DiagramType, string> = {
    architecture: `/diagrams?project=${projectId}&diagram=${diagramId}`,
    mindmap: `/mindmap?project=${projectId}&diagram=${diagramId}`,
    flowchart: `/flowchart?project=${projectId}&diagram=${diagramId}`,
    journey: `/diagrams?project=${projectId}&diagram=${diagramId}`,
    storymap: `/diagrams?project=${projectId}&diagram=${diagramId}`,
  }
  return routes[diagramType]
}

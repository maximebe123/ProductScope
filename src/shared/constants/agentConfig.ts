/**
 * Agent Configuration Constants
 *
 * Centralized configuration for AI agent display in discovery modals.
 * Used by FeatureDiscoveryModal and KPIDiscoveryModal.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  Search,
  BarChart3,
  Wrench,
  FileText,
  Target,
  Package,
  Calculator,
} from 'lucide-react'

// =============================================================================
// SHARED PRIORITY COLORS
// =============================================================================

/**
 * Priority color scheme used across discovery modals
 */
export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

// =============================================================================
// FEATURE DISCOVERY AGENTS
// =============================================================================

/**
 * Agent icons for feature discovery mode
 */
export const FEATURE_DISCOVERY_AGENT_ICONS: Record<string, LucideIcon> = {
  code_analyzer: Brain,
  feature_discoverer: Search,
  gap_analyst: BarChart3,
  tech_debt_analyst: Wrench,
  feature_enricher: FileText,
  priority_ranker: Target,
}

/**
 * Agent icons for feature extraction mode
 */
export const FEATURE_EXTRACTION_AGENT_ICONS: Record<string, LucideIcon> = {
  code_analyzer: Brain,
  feature_extractor: Package,
  feature_enricher: FileText,
}

/**
 * Agent colors for feature discovery/extraction
 */
export const FEATURE_AGENT_COLORS: Record<string, string> = {
  code_analyzer: 'text-purple-400 bg-purple-900/50',
  feature_discoverer: 'text-blue-400 bg-blue-900/50',
  feature_extractor: 'text-blue-400 bg-blue-900/50',
  gap_analyst: 'text-cyan-400 bg-cyan-900/50',
  tech_debt_analyst: 'text-amber-400 bg-amber-900/50',
  feature_enricher: 'text-green-400 bg-green-900/50',
  priority_ranker: 'text-pink-400 bg-pink-900/50',
}

/**
 * Agent labels for feature discovery mode
 */
export const FEATURE_DISCOVERY_AGENT_LABELS: Record<string, string> = {
  code_analyzer: 'Code Analyzer',
  feature_discoverer: 'Feature Discoverer',
  gap_analyst: 'Gap Analyst',
  tech_debt_analyst: 'Tech Debt Analyst',
  feature_enricher: 'Feature Enricher',
  priority_ranker: 'Priority Ranker',
}

/**
 * Agent labels for feature extraction mode
 */
export const FEATURE_EXTRACTION_AGENT_LABELS: Record<string, string> = {
  code_analyzer: 'Code Analyzer',
  feature_extractor: 'Feature Extractor',
  feature_enricher: 'Feature Enricher',
}

/**
 * Progress stages for feature discovery
 */
export const FEATURE_DISCOVERY_STAGES = [
  { id: 'code_analyzer', label: 'Analyze' },
  { id: 'feature_discoverer', label: 'Discover' },
  { id: 'parallel', label: 'Analyze Gaps' },
  { id: 'feature_enricher', label: 'Enrich' },
  { id: 'priority_ranker', label: 'Rank' },
] as const

/**
 * Progress stages for feature extraction
 */
export const FEATURE_EXTRACTION_STAGES = [
  { id: 'code_analyzer', label: 'Analyze' },
  { id: 'feature_extractor', label: 'Extract' },
  { id: 'feature_enricher', label: 'Enrich' },
] as const

// =============================================================================
// KPI DISCOVERY AGENTS
// =============================================================================

/**
 * Agent icons for KPI discovery
 */
export const KPI_AGENT_ICONS: Record<string, LucideIcon> = {
  domain_analyzer: Brain,
  kpi_discoverer: Search,
  kpi_enricher: FileText,
  value_ranker: Target,
}

/**
 * Agent colors for KPI discovery
 */
export const KPI_AGENT_COLORS: Record<string, string> = {
  domain_analyzer: 'text-purple-400 bg-purple-900/50',
  kpi_discoverer: 'text-blue-400 bg-blue-900/50',
  kpi_enricher: 'text-green-400 bg-green-900/50',
  value_ranker: 'text-pink-400 bg-pink-900/50',
}

/**
 * Agent labels for KPI discovery
 */
export const KPI_AGENT_LABELS: Record<string, string> = {
  domain_analyzer: 'Domain Analyzer',
  kpi_discoverer: 'KPI Discoverer',
  kpi_enricher: 'KPI Enricher',
  value_ranker: 'Value Ranker',
}

/**
 * Progress stages for KPI discovery
 */
export const KPI_DISCOVERY_STAGES = [
  { id: 'domain_analyzer', label: 'Analyze Domain' },
  { id: 'kpi_discoverer', label: 'Discover KPIs' },
  { id: 'kpi_enricher', label: 'Enrich' },
  { id: 'value_ranker', label: 'Rank' },
] as const

/**
 * KPI category color scheme
 */
export const KPI_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  efficiency: { bg: 'bg-blue-100', text: 'text-blue-700' },
  quality: { bg: 'bg-green-100', text: 'text-green-700' },
  adoption: { bg: 'bg-purple-100', text: 'text-purple-700' },
  revenue: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  satisfaction: { bg: 'bg-pink-100', text: 'text-pink-700' },
  growth: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  operational: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

// =============================================================================
// MULTI-AGENT DIAGRAM GENERATION
// =============================================================================

/**
 * Agent icons for diagram generation pipeline
 */
export const DIAGRAM_AGENT_ICONS: Record<string, LucideIcon> = {
  architect: Brain,
  component: Package,
  connection: Target,
  grouping: BarChart3,
  layout: Calculator,
  reviewer: Search,
  finalizer: FileText,
}

/**
 * Agent colors for diagram generation
 */
export const DIAGRAM_AGENT_COLORS: Record<string, string> = {
  architect: 'text-purple-400 bg-purple-900/50',
  component: 'text-blue-400 bg-blue-900/50',
  connection: 'text-cyan-400 bg-cyan-900/50',
  grouping: 'text-amber-400 bg-amber-900/50',
  layout: 'text-green-400 bg-green-900/50',
  reviewer: 'text-pink-400 bg-pink-900/50',
  finalizer: 'text-gray-400 bg-gray-900/50',
}

/**
 * Agent labels for diagram generation
 */
export const DIAGRAM_AGENT_LABELS: Record<string, string> = {
  architect: 'Architect',
  component: 'Component Specialist',
  connection: 'Connection Expert',
  grouping: 'Grouping Strategist',
  layout: 'Layout Optimizer',
  reviewer: 'Quality Reviewer',
  finalizer: 'Finalizer',
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get display configuration for an agent
 */
export function getAgentConfig(
  agentId: string,
  icons: Record<string, LucideIcon>,
  colors: Record<string, string>,
  labels: Record<string, string>,
) {
  return {
    icon: icons[agentId] || Brain,
    color: colors[agentId] || 'text-gray-400 bg-gray-900/50',
    label: labels[agentId] || agentId,
  }
}

/**
 * Calculate progress percentage from completed stages
 */
export function calculateProgress(
  completedAgents: string[],
  stages: readonly { id: string; label: string }[],
): number {
  if (stages.length === 0) return 0
  const completed = stages.filter(s => completedAgents.includes(s.id)).length
  return Math.round((completed / stages.length) * 100)
}

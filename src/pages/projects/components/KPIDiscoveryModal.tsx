/**
 * KPI Discovery Modal
 * Multi-phase modal for discovering business KPIs from GitHub
 * Uses AI agents to analyze the business domain and suggest relevant KPIs
 */

import { useState, useEffect, useRef } from 'react'
import {
  X,
  GitBranch,
  TrendingUp,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Brain,
  Search,
  FileText,
  Target,
  CheckCircle2,
  BarChart3,
  Calculator,
  Database,
} from 'lucide-react'
import { useKPIDiscovery } from '../../../hooks/useKPIDiscovery'
import type { CandidateKPI, GitHubAttachment } from '../../../services/projectApi'

interface KPIDiscoveryModalProps {
  projectId: string
  github: GitHubAttachment
  onClose: () => void
  onComplete: () => void
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  efficiency: { bg: 'bg-blue-100', text: 'text-blue-700' },
  quality: { bg: 'bg-green-100', text: 'text-green-700' },
  adoption: { bg: 'bg-purple-100', text: 'text-purple-700' },
  revenue: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  satisfaction: { bg: 'bg-pink-100', text: 'text-pink-700' },
  growth: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  operational: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

const AGENT_ICONS: Record<string, typeof Brain> = {
  domain_analyzer: Brain,
  kpi_discoverer: Search,
  kpi_enricher: FileText,
  value_ranker: Target,
}

const AGENT_COLORS: Record<string, string> = {
  domain_analyzer: 'text-purple-400 bg-purple-900/50',
  kpi_discoverer: 'text-blue-400 bg-blue-900/50',
  kpi_enricher: 'text-green-400 bg-green-900/50',
  value_ranker: 'text-pink-400 bg-pink-900/50',
}

const AGENT_LABELS: Record<string, string> = {
  domain_analyzer: 'Domain Analyzer',
  kpi_discoverer: 'KPI Discoverer',
  kpi_enricher: 'KPI Enricher',
  value_ranker: 'Value Ranker',
}

const stages = [
  { id: 'domain_analyzer', label: 'Analyze Domain' },
  { id: 'kpi_discoverer', label: 'Discover KPIs' },
  { id: 'kpi_enricher', label: 'Enrich' },
  { id: 'value_ranker', label: 'Rank' },
]

export function KPIDiscoveryModal({
  projectId,
  github,
  onClose,
  onComplete,
}: KPIDiscoveryModalProps) {
  const {
    state,
    startDiscovery,
    cancelDiscovery,
    toggleKPISelection,
    selectAll,
    deselectAll,
    saveSelectedKPIs,
    reset,
  } = useKPIDiscovery()

  // Config phase state
  const [userContext, setUserContext] = useState('')

  // Review phase state
  const [expandedKPI, setExpandedKPI] = useState<string | null>(null)

  // Logs auto-scroll
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [state.agentLogs])

  const handleStartDiscovery = async () => {
    const authToken = sessionStorage.getItem('github_token') || undefined

    await startDiscovery(projectId, {
      user_context: userContext || undefined,
      auth_token: authToken,
    })
  }

  const handleSaveKPIs = async () => {
    try {
      await saveSelectedKPIs(projectId)
      onComplete()
      onClose()
    } catch {
      // Error is handled in the hook
    }
  }

  const selectedCount = state.candidates.filter(c => c.selected).length

  // Determine current stage index based on agent logs
  const getCurrentStageIndex = () => {
    const lastLog = state.agentLogs[state.agentLogs.length - 1]
    if (!lastLog) return -1

    const agent = lastLog.agent
    if (agent === 'domain_analyzer') return 0
    if (agent === 'kpi_discoverer') return 1
    if (agent === 'kpi_enricher') return 2
    if (agent === 'value_ranker') return 3
    return -1
  }

  const currentStageIndex = getCurrentStageIndex()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <TrendingUp className="text-emerald-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {state.phase === 'idle' && 'Discover Business KPIs'}
                {state.phase === 'running' && 'Discovering KPIs...'}
                {state.phase === 'reviewing' && `Review KPIs (${state.candidates.length} found)`}
                {state.phase === 'saving' && 'Saving KPIs...'}
                {state.phase === 'complete' && 'KPIs Added'}
                {state.phase === 'error' && 'Discovery Error'}
              </h2>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <GitBranch size={14} />
                {github.owner}/{github.repo_name}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cancelDiscovery()
              onClose()
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Config Phase */}
          {state.phase === 'idle' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <TrendingUp size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Business KPI Discovery</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      AI will analyze your codebase to understand the business domain and suggest
                      KPIs that valorize your application - efficiency gains, quality improvements,
                      adoption metrics, and more.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning for private repos without auth */}
              {github.is_private && !sessionStorage.getItem('github_token') && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Private Repository</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        This repository is private. Please connect your GitHub account first to access it.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Context (optional)
                </label>
                <textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="E.g., 'Focus on customer value metrics' or 'Prioritize efficiency gains'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary h-24 resize-none"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">What happens next?</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>AI analyzes your repository to understand the business domain</li>
                  <li>Determines the optimal number of KPIs based on complexity</li>
                  <li>Suggests business KPIs (not technical metrics) for valorization</li>
                  <li>Adds calculation methods and data sources for each KPI</li>
                  <li>You review and select which KPIs to track</li>
                </ol>
              </div>
            </div>
          )}

          {/* Running Phase */}
          {state.phase === 'running' && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="relative">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
                <span className="absolute right-0 -top-6 text-xs text-gray-500">
                  {state.progress}%
                </span>
              </div>

              {/* Stages */}
              <div className="flex justify-between">
                {stages.map((stage, index) => {
                  const isActive = index === currentStageIndex
                  const isCompleted = index < currentStageIndex
                  const isPending = index > currentStageIndex

                  return (
                    <div key={stage.id} className="flex flex-col items-center gap-2">
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          transition-all duration-300
                          ${isCompleted ? 'bg-green-500 text-white' : ''}
                          ${isActive ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' : ''}
                          ${isPending ? 'bg-gray-100 text-gray-400' : ''}
                        `}
                      >
                        {isCompleted ? (
                          <Check size={18} />
                        ) : isActive ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <BarChart3 size={18} />
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Agent Activity Log (Terminal style) */}
              {state.agentLogs.length > 0 && (
                <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs">
                  <div className="space-y-2">
                    {state.agentLogs.map((log, index) => {
                      const Icon = AGENT_ICONS[log.agent] || Brain
                      const colorClass = AGENT_COLORS[log.agent] || 'text-gray-400 bg-gray-800'
                      const label = AGENT_LABELS[log.agent] || log.agent
                      const isLatest = index === state.agentLogs.length - 1 && log.status === 'running'

                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-2 ${isLatest ? 'animate-pulse' : ''}`}
                        >
                          <div className={`p-1 rounded ${colorClass}`}>
                            <Icon size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-400">[{label}]</span>{' '}
                            <span className="text-gray-200">{log.description}</span>
                            {log.summary && (
                              <span className="text-green-400 ml-2">{log.summary}</span>
                            )}
                          </div>
                          {log.status === 'running' ? (
                            <Loader2 size={12} className="animate-spin text-gray-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      )
                    })}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review Phase */}
          {state.phase === 'reviewing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Select the KPIs you want to add to your project
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-auto">
                {state.candidates.map((kpi) => (
                  <KPICard
                    key={kpi.temp_id}
                    kpi={kpi}
                    isExpanded={expandedKPI === kpi.temp_id}
                    onToggle={() => toggleKPISelection(kpi.temp_id)}
                    onExpand={() =>
                      setExpandedKPI(
                        expandedKPI === kpi.temp_id ? null : kpi.temp_id
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Saving Phase */}
          {state.phase === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-gray-600">Saving {selectedCount} KPIs...</p>
            </div>
          )}

          {/* Error Phase */}
          {state.phase === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-3 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Discovery Failed
              </h3>
              <p className="text-gray-600 text-center mb-4">{state.error}</p>
              <button
                onClick={reset}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {state.phase === 'reviewing' && `${selectedCount} of ${state.candidates.length} selected`}
          </div>
          <div className="flex gap-3">
            {state.phase === 'idle' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartDiscovery}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <TrendingUp size={16} />
                  Start Discovery
                </button>
              </>
            )}
            {state.phase === 'running' && (
              <button
                onClick={cancelDiscovery}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            )}
            {state.phase === 'reviewing' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKPIs}
                  disabled={selectedCount === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check size={16} />
                  Add {selectedCount} KPIs
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// KPI Card Component
function KPICard({
  kpi,
  isExpanded,
  onToggle,
  onExpand,
}: {
  kpi: CandidateKPI
  isExpanded: boolean
  onToggle: () => void
  onExpand: () => void
}) {
  const priorityStyle = PRIORITY_COLORS[kpi.priority] || PRIORITY_COLORS.medium
  const categoryStyle = CATEGORY_COLORS[kpi.category] || CATEGORY_COLORS.efficiency

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        kpi.selected ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={kpi.selected || false}
            onChange={onToggle}
            className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-medium text-gray-900">{kpi.name}</h4>
              {kpi.unit && (
                <span className="text-xs text-gray-400">({kpi.unit})</span>
              )}
              <span className={`px-2 py-0.5 text-xs rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}>
                {kpi.category}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
                {kpi.priority}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{kpi.definition}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>Frequency: {kpi.frequency}</span>
              {kpi.impact_areas.length > 0 && (
                <span>{kpi.impact_areas.length} impact areas</span>
              )}
            </div>
          </div>
          <button
            onClick={onExpand}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 space-y-3">
          {kpi.calculation_method && (
            <div className="flex items-start gap-2">
              <Calculator size={14} className="text-gray-400 mt-0.5" />
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Calculation Method</h5>
                <p className="text-sm text-gray-700 font-mono bg-white px-2 py-1 rounded border">{kpi.calculation_method}</p>
              </div>
            </div>
          )}
          {kpi.data_sources.length > 0 && (
            <div className="flex items-start gap-2">
              <Database size={14} className="text-gray-400 mt-0.5" />
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Data Sources</h5>
                <div className="flex flex-wrap gap-1">
                  {kpi.data_sources.map((src, i) => (
                    <span key={i} className="text-xs bg-white px-2 py-0.5 rounded border">{src}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {kpi.target_guidance && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Target Guidance</h5>
              <p className="text-sm text-gray-700">{kpi.target_guidance}</p>
            </div>
          )}
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Business Value</h5>
            <p className="text-sm text-gray-700">{kpi.business_value}</p>
          </div>
          {kpi.impact_areas.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Impact Areas</h5>
              <div className="flex flex-wrap gap-1">
                {kpi.impact_areas.map((area, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{area}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

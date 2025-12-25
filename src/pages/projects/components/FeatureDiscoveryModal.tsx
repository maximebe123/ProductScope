/**
 * Feature Discovery Modal
 * Multi-phase modal for discovering OR extracting features from GitHub
 * - Extract mode: Identifies EXISTING features in the codebase
 * - Discover mode: Suggests NEW features based on analysis
 */

import { useState, useEffect, useRef } from 'react'
import {
  X,
  GitBranch,
  Sparkles,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Loader2,
  Brain,
  Search,
  Lightbulb,
  BarChart3,
  Wrench,
  FileText,
  Target,
  CheckCircle2,
  Download,
  Package,
} from 'lucide-react'
import { useFeatureDiscovery } from '../../../hooks/useFeatureDiscovery'
import { useFeatureExtraction } from '../../../hooks/useFeatureExtraction'
import type { CandidateFeature, GitHubAttachment } from '../../../services/projectApi'

type FeatureMode = 'extract' | 'discover'

interface FeatureDiscoveryModalProps {
  projectId: string
  github: GitHubAttachment
  onClose: () => void
  onComplete: () => void
  initialMode?: FeatureMode
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

// Agent icons and colors for discovery mode
const DISCOVERY_AGENT_ICONS: Record<string, typeof Brain> = {
  code_analyzer: Brain,
  feature_discoverer: Search,
  gap_analyst: BarChart3,
  tech_debt_analyst: Wrench,
  feature_enricher: FileText,
  priority_ranker: Target,
}

// Agent icons and colors for extraction mode
const EXTRACTION_AGENT_ICONS: Record<string, typeof Brain> = {
  code_analyzer: Brain,
  feature_extractor: Package,
  feature_enricher: FileText,
}

const AGENT_COLORS: Record<string, string> = {
  code_analyzer: 'text-purple-400 bg-purple-900/50',
  feature_discoverer: 'text-blue-400 bg-blue-900/50',
  feature_extractor: 'text-blue-400 bg-blue-900/50',
  gap_analyst: 'text-cyan-400 bg-cyan-900/50',
  tech_debt_analyst: 'text-amber-400 bg-amber-900/50',
  feature_enricher: 'text-green-400 bg-green-900/50',
  priority_ranker: 'text-pink-400 bg-pink-900/50',
}

const DISCOVERY_AGENT_LABELS: Record<string, string> = {
  code_analyzer: 'Code Analyzer',
  feature_discoverer: 'Feature Discoverer',
  gap_analyst: 'Gap Analyst',
  tech_debt_analyst: 'Tech Debt Analyst',
  feature_enricher: 'Feature Enricher',
  priority_ranker: 'Priority Ranker',
}

const EXTRACTION_AGENT_LABELS: Record<string, string> = {
  code_analyzer: 'Code Analyzer',
  feature_extractor: 'Feature Extractor',
  feature_enricher: 'Feature Enricher',
}

// Progress stages for discovery mode
const discoveryStages = [
  { id: 'code_analyzer', label: 'Analyze' },
  { id: 'feature_discoverer', label: 'Discover' },
  { id: 'parallel', label: 'Analyze Gaps' },
  { id: 'feature_enricher', label: 'Enrich' },
  { id: 'priority_ranker', label: 'Rank' },
]

// Progress stages for extraction mode
const extractionStages = [
  { id: 'code_analyzer', label: 'Analyze' },
  { id: 'feature_extractor', label: 'Extract' },
  { id: 'feature_enricher', label: 'Enrich' },
]

export function FeatureDiscoveryModal({
  projectId,
  github,
  onClose,
  onComplete,
  initialMode = 'discover',
}: FeatureDiscoveryModalProps) {
  // Mode state
  const [mode, setMode] = useState<FeatureMode>(initialMode)

  // Hook for discovery
  const discovery = useFeatureDiscovery()

  // Hook for extraction
  const extraction = useFeatureExtraction()

  // Get the right state and functions based on mode
  const state = mode === 'discover' ? discovery.state : extraction.state
  const cancelProcess = mode === 'discover' ? discovery.cancelDiscovery : extraction.cancelExtraction
  const toggleFeatureSelection = mode === 'discover' ? discovery.toggleFeatureSelection : extraction.toggleFeatureSelection
  const selectAll = mode === 'discover' ? discovery.selectAll : extraction.selectAll
  const deselectAll = mode === 'discover' ? discovery.deselectAll : extraction.deselectAll
  const saveSelectedFeatures = mode === 'discover' ? discovery.saveSelectedFeatures : extraction.saveSelectedFeatures
  const reset = mode === 'discover' ? discovery.reset : extraction.reset

  // Config phase state
  const [maxFeatures, setMaxFeatures] = useState(mode === 'discover' ? 15 : 20)
  const [includeTechDebt, setIncludeTechDebt] = useState(true)
  const [userContext, setUserContext] = useState('')

  // Review phase state
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  // Logs auto-scroll
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Update maxFeatures when mode changes
  useEffect(() => {
    setMaxFeatures(mode === 'discover' ? 15 : 20)
  }, [mode])

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [state.agentLogs])

  const handleStartProcess = async () => {
    // Get GitHub token from sessionStorage (set during OAuth flow)
    const authToken = sessionStorage.getItem('github_token') || undefined

    if (mode === 'discover') {
      await discovery.startDiscovery(projectId, {
        max_features: maxFeatures,
        include_tech_debt: includeTechDebt,
        user_context: userContext || undefined,
        auth_token: authToken,
      })
    } else {
      await extraction.startExtraction(projectId, {
        max_features: maxFeatures,
        user_context: userContext || undefined,
        auth_token: authToken,
      })
    }
  }

  const handleSaveFeatures = async () => {
    try {
      await saveSelectedFeatures(projectId)
      onComplete()
      onClose()
    } catch {
      // Error is handled in the hook
    }
  }

  const selectedCount = state.candidates.filter(c => c.selected).length

  // Get stages and labels based on mode
  const stages = mode === 'discover' ? discoveryStages : extractionStages
  const agentIcons = mode === 'discover' ? DISCOVERY_AGENT_ICONS : EXTRACTION_AGENT_ICONS
  const agentLabels = mode === 'discover' ? DISCOVERY_AGENT_LABELS : EXTRACTION_AGENT_LABELS

  // Determine current stage index based on agent logs
  const getCurrentStageIndex = () => {
    const lastLog = state.agentLogs[state.agentLogs.length - 1]
    if (!lastLog) return -1

    const agent = lastLog.agent
    if (mode === 'discover') {
      if (agent === 'code_analyzer') return 0
      if (agent === 'feature_discoverer') return 1
      if (agent === 'gap_analyst' || agent === 'tech_debt_analyst') return 2
      if (agent === 'feature_enricher') return 3
      if (agent === 'priority_ranker') return 4
    } else {
      if (agent === 'code_analyzer') return 0
      if (agent === 'feature_extractor') return 1
      if (agent === 'feature_enricher') return 2
    }
    return -1
  }

  const currentStageIndex = getCurrentStageIndex()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mode === 'discover' ? 'bg-purple-100' : 'bg-blue-100'}`}>
              {mode === 'discover' ? (
                <Sparkles className="text-purple-600" size={20} />
              ) : (
                <Download className="text-blue-600" size={20} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {state.phase === 'idle' && (mode === 'discover' ? 'Discover New Features' : 'Extract Existing Features')}
                {state.phase === 'running' && (mode === 'discover' ? 'Discovering Features...' : 'Extracting Features...')}
                {state.phase === 'reviewing' && `Review Features (${state.candidates.length} found)`}
                {state.phase === 'saving' && 'Saving Features...'}
                {state.phase === 'complete' && 'Features Added'}
                {state.phase === 'error' && (mode === 'discover' ? 'Discovery Error' : 'Extraction Error')}
              </h2>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <GitBranch size={14} />
                {github.owner}/{github.repo_name}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cancelProcess()
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
              {/* Mode Toggle */}
              <div className="flex gap-3 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setMode('extract')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all ${
                    mode === 'extract'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Package size={18} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Import Existing</div>
                    <div className="text-xs text-gray-500">Features already built</div>
                  </div>
                </button>
                <button
                  onClick={() => setMode('discover')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-all ${
                    mode === 'discover'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sparkles size={18} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Discover New</div>
                    <div className="text-xs text-gray-500">AI-suggested features</div>
                  </div>
                </button>
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
                  Maximum Features to {mode === 'discover' ? 'Discover' : 'Extract'}
                </label>
                <select
                  value={maxFeatures}
                  onChange={(e) => setMaxFeatures(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value={5}>5 features</option>
                  <option value={10}>10 features</option>
                  <option value={15}>{mode === 'discover' ? '15 features (recommended)' : '15 features'}</option>
                  <option value={20}>{mode === 'extract' ? '20 features (recommended)' : '20 features'}</option>
                  <option value={30}>30 features</option>
                  {mode === 'extract' && <option value={50}>50 features</option>}
                </select>
              </div>

              {mode === 'discover' && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="includeTechDebt"
                    checked={includeTechDebt}
                    onChange={(e) => setIncludeTechDebt(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="includeTechDebt" className="text-sm text-gray-700">
                    Include technical debt improvements (refactoring, testing, performance)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Context (optional)
                </label>
                <textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder={mode === 'discover'
                    ? "E.g., 'Focus on mobile features' or 'Prioritize performance improvements'"
                    : "E.g., 'Focus on API endpoints' or 'Extract frontend features only'"
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary h-24 resize-none"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">What happens next?</h4>
                {mode === 'discover' ? (
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>AI analyzes your repository structure and code</li>
                    <li>Discovers potential new features from code patterns and best practices</li>
                    <li>Generates detailed specifications for each feature</li>
                    <li>You review and select which features to add</li>
                  </ol>
                ) : (
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>AI analyzes your repository structure, endpoints, and components</li>
                    <li>Identifies features already implemented in your codebase</li>
                    <li>Enriches each feature with problem/solution statements</li>
                    <li>You review and import the features you want to track</li>
                  </ol>
                )}
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
                    className="h-full bg-primary transition-all duration-500 ease-out"
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
                          ${isActive ? 'bg-primary text-white ring-4 ring-primary/20' : ''}
                          ${isPending ? 'bg-gray-100 text-gray-400' : ''}
                        `}
                      >
                        {isCompleted ? (
                          <Check size={18} />
                        ) : isActive ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Lightbulb size={18} />
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
                      const Icon = agentIcons[log.agent] || Brain
                      const colorClass = AGENT_COLORS[log.agent] || 'text-gray-400 bg-gray-800'
                      const label = agentLabels[log.agent] || log.agent
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
                  Select the features you want to {mode === 'discover' ? 'add to' : 'import into'} your project
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
                {state.candidates.map((feature) => (
                  <FeatureCard
                    key={feature.temp_id}
                    feature={feature}
                    isExpanded={expandedFeature === feature.temp_id}
                    onToggle={() => toggleFeatureSelection(feature.temp_id)}
                    onExpand={() =>
                      setExpandedFeature(
                        expandedFeature === feature.temp_id ? null : feature.temp_id
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
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-gray-600">Saving {selectedCount} features...</p>
            </div>
          )}

          {/* Error Phase */}
          {state.phase === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-3 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {mode === 'discover' ? 'Discovery Failed' : 'Extraction Failed'}
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
                  onClick={handleStartProcess}
                  className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                    mode === 'discover'
                      ? 'bg-primary hover:bg-primary/90'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {mode === 'discover' ? (
                    <>
                      <Sparkles size={16} />
                      Start Discovery
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Start Extraction
                    </>
                  )}
                </button>
              </>
            )}
            {state.phase === 'running' && (
              <button
                onClick={cancelProcess}
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
                  onClick={handleSaveFeatures}
                  disabled={selectedCount === 0}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check size={16} />
                  {mode === 'discover' ? 'Add' : 'Import'} {selectedCount} Features
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Feature Card Component
function FeatureCard({
  feature,
  isExpanded,
  onToggle,
  onExpand,
}: {
  feature: CandidateFeature
  isExpanded: boolean
  onToggle: () => void
  onExpand: () => void
}) {
  const priorityStyle = PRIORITY_COLORS[feature.priority] || PRIORITY_COLORS.medium
  const stars = feature.priority === 'critical' ? 3 : feature.priority === 'high' ? 2 : 1

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        feature.selected ? 'border-primary bg-primary/5' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={feature.selected || false}
            onChange={onToggle}
            className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={12} className="text-amber-500 fill-amber-500" />
                ))}
              </span>
              <h4 className="font-medium text-gray-900 truncate">{feature.title}</h4>
              <span className={`px-2 py-0.5 text-xs rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
                {feature.priority}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{feature.problem}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>Effort: {feature.effort_estimate}</span>
              <span>Impact: {feature.impact_estimate}</span>
              {feature.tags.length > 0 && (
                <span className="flex gap-1">
                  {feature.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded">
                      {tag}
                    </span>
                  ))}
                </span>
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
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Solution</h5>
            <p className="text-sm text-gray-700">{feature.solution}</p>
          </div>
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Target Users</h5>
            <p className="text-sm text-gray-700">{feature.target_users}</p>
          </div>
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Success Metrics</h5>
            <p className="text-sm text-gray-700">{feature.success_metrics}</p>
          </div>
          {feature.technical_notes && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Technical Notes</h5>
              <p className="text-sm text-gray-700">{feature.technical_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

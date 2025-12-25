/**
 * User Journey Tab
 * User journey maps with horizontal timeline visualization and AI generation
 */

import { useState } from 'react'
import {
  Plus,
  Trash2,
  Filter,
  Sparkles,
  X,
  Route,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  User,
} from 'lucide-react'
import {
  userJourneyApi,
  type UserJourney,
  type JourneyStatus,
  type JourneyStep,
  type EmotionLevel,
} from '../../../services/projectApi'

const JOURNEY_STATUS_META: Record<JourneyStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  validated: { label: 'Validated', color: 'text-green-600', bg: 'bg-green-100' },
  archived: { label: 'Archived', color: 'text-gray-500', bg: 'bg-gray-100' },
}

const EMOTION_EMOJI: Record<EmotionLevel, string> = {
  1: '😫',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '😍',
}

const EMOTION_COLOR: Record<EmotionLevel, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-gray-500',
  4: 'text-green-500',
  5: 'text-emerald-500',
}

export interface UserJourneyTabProps {
  projectId: string
  journeys: UserJourney[]
  onUpdate: () => void
}

export function UserJourneyTab({ projectId, journeys, onUpdate }: UserJourneyTabProps) {
  const [filterStatus, setFilterStatus] = useState<JourneyStatus | 'all'>('all')
  const [selectedJourney, setSelectedJourney] = useState<UserJourney | null>(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [aiPersona, setAiPersona] = useState('')
  const [aiGoal, setAiGoal] = useState('')
  const [generating, setGenerating] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    persona: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormData({ title: '', persona: '', description: '' })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      setSaving(true)
      await userJourneyApi.create(projectId, {
        title: formData.title.trim(),
        persona: formData.persona.trim() || undefined,
        description: formData.description.trim() || undefined,
        phases: [],
        steps: [],
      })
      setShowNewModal(false)
      resetForm()
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create journey')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (journeyId: string) => {
    if (!confirm('Delete this user journey?')) return
    try {
      await userJourneyApi.delete(projectId, journeyId)
      if (selectedJourney?.id === journeyId) setSelectedJourney(null)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete journey')
    }
  }

  const handleStatusChange = async (journeyId: string, status: JourneyStatus) => {
    try {
      await userJourneyApi.update(projectId, journeyId, { status })
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update journey')
    }
  }

  const handleAIGenerate = async () => {
    if (!aiPersona.trim() || !aiGoal.trim()) return
    try {
      setGenerating(true)
      const result = await userJourneyApi.generate(projectId, {
        persona: aiPersona.trim(),
        goal: aiGoal.trim(),
      })
      setShowAIModal(false)
      setAiPersona('')
      setAiGoal('')
      setSelectedJourney(result.journey)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate journey')
    } finally {
      setGenerating(false)
    }
  }

  const filteredJourneys = journeys.filter(j => {
    if (filterStatus !== 'all' && j.status !== filterStatus) return false
    return true
  })

  // Group steps by phase
  const getStepsByPhase = (journey: UserJourney): Map<string, JourneyStep[]> => {
    const map = new Map<string, JourneyStep[]>()
    journey.phases.forEach(p => map.set(p.id, []))
    journey.steps.forEach(s => {
      const steps = map.get(s.phase_id) || []
      steps.push(s)
      map.set(s.phase_id, steps.sort((a, b) => a.order - b.order))
    })
    return map
  }

  const JourneyTimeline = ({ journey }: { journey: UserJourney }) => {
    const stepsByPhase = getStepsByPhase(journey)
    const sortedPhases = [...journey.phases].sort((a, b) => a.order - b.order)

    if (sortedPhases.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Route size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No phases defined yet</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto pb-4">
        {/* Phase Headers */}
        <div className="flex gap-4 min-w-max">
          {sortedPhases.map((phase, idx) => (
            <div key={phase.id} className="flex items-center">
              <div className="w-48 flex-shrink-0">
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-center">
                  <span className="font-medium text-gray-900">{phase.name}</span>
                </div>
              </div>
              {idx < sortedPhases.length - 1 && (
                <ChevronRight size={20} className="text-gray-300 mx-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="flex gap-4 mt-4 min-w-max">
          {sortedPhases.map((phase, idx) => {
            const steps = stepsByPhase.get(phase.id) || []
            return (
              <div key={phase.id} className="flex items-start">
                <div className="w-48 flex-shrink-0 space-y-2">
                  {steps.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-4">No steps</div>
                  ) : (
                    steps.map((step) => (
                      <div key={step.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">{step.touchpoint}</span>
                          <span className={`text-lg ${EMOTION_COLOR[step.emotion as EmotionLevel]}`}>
                            {EMOTION_EMOJI[step.emotion as EmotionLevel]}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{step.action}</p>
                        {step.thought && (
                          <p className="text-xs text-gray-500 italic">"{step.thought}"</p>
                        )}
                        {step.pain_point && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                            <AlertTriangle size={12} />
                            <span>{step.pain_point}</span>
                          </div>
                        )}
                        {step.opportunity && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                            <Lightbulb size={12} />
                            <span>{step.opportunity}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {idx < sortedPhases.length - 1 && <div className="w-6 flex-shrink-0" />}
              </div>
            )
          })}
        </div>

        {/* Emotion Curve */}
        {journey.steps.length > 1 && (
          <div className="mt-6">
            <h4 className="text-xs font-medium text-gray-500 mb-2">Emotion Curve</h4>
            <EmotionCurve journey={journey} />
          </div>
        )}
      </div>
    )
  }

  const EmotionCurve = ({ journey }: { journey: UserJourney }) => {
    const sortedSteps = [...journey.steps].sort((a, b) => {
      const phaseA = journey.phases.find(p => p.id === a.phase_id)?.order || 0
      const phaseB = journey.phases.find(p => p.id === b.phase_id)?.order || 0
      return phaseA !== phaseB ? phaseA - phaseB : a.order - b.order
    })

    if (sortedSteps.length < 2) return null

    const width = Math.max(400, sortedSteps.length * 80)
    const height = 60
    const padding = 20
    const maxEmotion = 5
    const stepWidth = (width - padding * 2) / (sortedSteps.length - 1)

    const points = sortedSteps.map((step, i) => ({
      x: padding + i * stepWidth,
      y: height - padding - ((step.emotion - 1) / (maxEmotion - 1)) * (height - padding * 2),
    }))

    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`
      const prev = points[i - 1]
      const cpx = (prev.x + point.x) / 2
      return `${acc} C ${cpx} ${prev.y}, ${cpx} ${point.y}, ${point.x} ${point.y}`
    }, '')

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="emotionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect x={padding} y={padding} width={width - padding * 2} height={height - padding * 2} fill="url(#emotionGradient)" rx="4" />
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" />
        {points.map((point, i) => (
          <circle key={i} cx={point.x} cy={point.y} r="4" fill="#6366f1" />
        ))}
      </svg>
    )
  }

  const AIModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Generate User Journey with AI</h2>
          </div>
          <button onClick={() => setShowAIModal(false)} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
            <input
              type="text"
              value={aiPersona}
              onChange={(e) => setAiPersona(e.target.value)}
              placeholder="E.g., New user, Power user, Enterprise admin..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
            <textarea
              value={aiGoal}
              onChange={(e) => setAiGoal(e.target.value)}
              placeholder="E.g., Complete the onboarding process and create their first project..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAIModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAIGenerate}
              disabled={!aiPersona.trim() || !aiGoal.trim() || generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles size={16} />
              {generating ? 'Generating...' : 'Generate Journey'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const NewJourneyModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create New Journey</h2>
          <button onClick={() => { setShowNewModal(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="E.g., New user onboarding journey"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
            <input
              type="text"
              value={formData.persona}
              onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
              placeholder="E.g., New user, Admin..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this journey..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowNewModal(false); resetForm() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Journey'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-gray-900">User Journeys</h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as JourneyStatus | 'all')}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              {Object.entries(JOURNEY_STATUS_META).map(([status, meta]) => (
                <option key={status} value={status}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Sparkles size={16} />
            AI Generate
          </button>
          <button
            onClick={() => { resetForm(); setShowNewModal(true) }}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Journey
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Journey List */}
        <div className="w-64 flex-shrink-0">
          {filteredJourneys.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
              <Route size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No journeys yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredJourneys.map((journey) => {
                const statusMeta = JOURNEY_STATUS_META[journey.status]
                const isSelected = selectedJourney?.id === journey.id

                return (
                  <div
                    key={journey.id}
                    className={`bg-white rounded-lg border p-3 cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedJourney(journey)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{journey.title}</h3>
                        {journey.persona && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <User size={12} />
                            <span>{journey.persona}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${statusMeta.bg} ${statusMeta.color}`}>
                            {statusMeta.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {journey.phases.length} phases
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(journey.id) }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Journey Detail */}
        <div className="flex-1 min-w-0">
          {selectedJourney ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedJourney.title}</h3>
                  {selectedJourney.persona && (
                    <p className="text-sm text-gray-500">Persona: {selectedJourney.persona}</p>
                  )}
                  {selectedJourney.description && (
                    <p className="text-sm text-gray-500 mt-1">{selectedJourney.description}</p>
                  )}
                </div>
                <select
                  value={selectedJourney.status}
                  onChange={(e) => handleStatusChange(selectedJourney.id, e.target.value as JourneyStatus)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                >
                  {Object.entries(JOURNEY_STATUS_META).map(([status, meta]) => (
                    <option key={status} value={status}>{meta.label}</option>
                  ))}
                </select>
              </div>
              <JourneyTimeline journey={selectedJourney} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Route size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Select a journey</h3>
              <p className="text-gray-500">
                Choose a journey from the list or create a new one
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAIModal && <AIModal />}
      {showNewModal && <NewJourneyModal />}
    </div>
  )
}

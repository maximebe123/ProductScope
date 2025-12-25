/**
 * Features Tab
 * Feature specifications with structured sections, AI generation, and CRUD
 */

import { useState } from 'react'
import {
  Plus,
  Trash2,
  Target,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit3,
  Sparkles,
  X,
  Lightbulb,
  GitBranch,
} from 'lucide-react'
import {
  featureApi,
  type Feature,
  type FeatureStatus,
  type FeaturePriority,
  type GitHubAttachment,
} from '../../../services/projectApi'
import { FeatureDiscoveryModal } from '../components/FeatureDiscoveryModal'

const FEATURE_STATUS_META: Record<FeatureStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  defined: { label: 'Defined', color: 'text-blue-600', bg: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-100' },
  shipped: { label: 'Shipped', color: 'text-green-600', bg: 'bg-green-100' },
  archived: { label: 'Archived', color: 'text-gray-500', bg: 'bg-gray-100' },
}

const FEATURE_PRIORITY_META: Record<FeaturePriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-400' },
  medium: { label: 'Medium', color: 'text-gray-500' },
  high: { label: 'High', color: 'text-orange-500' },
  critical: { label: 'Critical', color: 'text-red-500' },
}

export interface FeaturesTabProps {
  projectId: string
  features: Feature[]
  onUpdate: () => void
  github?: GitHubAttachment
}

export function FeaturesTab({ projectId, features, onUpdate, github }: FeaturesTabProps) {
  const [showNewFeature, setShowNewFeature] = useState(false)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [filterStatus, setFilterStatus] = useState<FeatureStatus | 'all'>('all')
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiDescription, setAiDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    problem: '',
    solution: '',
    target_users: '',
    success_metrics: '',
    technical_notes: '',
    priority: 'medium' as FeaturePriority,
    tags: '',
  })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormData({
      title: '',
      problem: '',
      solution: '',
      target_users: '',
      success_metrics: '',
      technical_notes: '',
      priority: 'medium',
      tags: '',
    })
  }

  const openEditModal = (feature: Feature) => {
    setEditingFeature(feature)
    setFormData({
      title: feature.title,
      problem: feature.problem || '',
      solution: feature.solution || '',
      target_users: feature.target_users || '',
      success_metrics: feature.success_metrics || '',
      technical_notes: feature.technical_notes || '',
      priority: feature.priority,
      tags: feature.tags.join(', '),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      setSaving(true)
      const data = {
        title: formData.title.trim(),
        problem: formData.problem.trim() || undefined,
        solution: formData.solution.trim() || undefined,
        target_users: formData.target_users.trim() || undefined,
        success_metrics: formData.success_metrics.trim() || undefined,
        technical_notes: formData.technical_notes.trim() || undefined,
        priority: formData.priority,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }

      if (editingFeature) {
        await featureApi.update(projectId, editingFeature.id, data)
        setEditingFeature(null)
      } else {
        await featureApi.create(projectId, data)
        setShowNewFeature(false)
      }
      resetForm()
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save feature')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (featureId: string) => {
    if (!confirm('Delete this feature?')) return
    try {
      await featureApi.delete(projectId, featureId)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete feature')
    }
  }

  const handleStatusChange = async (featureId: string, status: FeatureStatus) => {
    try {
      await featureApi.update(projectId, featureId, { status })
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update feature')
    }
  }

  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) return
    try {
      setGenerating(true)
      await featureApi.generate(projectId, { description: aiDescription })
      setShowAIModal(false)
      setAiDescription('')
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate feature')
    } finally {
      setGenerating(false)
    }
  }

  const filteredFeatures = features.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false
    return true
  })

  const FeatureModal = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Feature' : 'Create New Feature'}
          </h2>
          <button
            onClick={() => { if (isEdit) setEditingFeature(null); else setShowNewFeature(false); resetForm() }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Feature name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as FeaturePriority })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {Object.entries(FEATURE_PRIORITY_META).map(([priority, meta]) => (
                <option key={priority} value={priority}>{meta.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problem</label>
            <textarea
              value={formData.problem}
              onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
              placeholder="What problem does this feature solve?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solution</label>
            <textarea
              value={formData.solution}
              onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
              placeholder="How will this feature solve the problem?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Users</label>
              <input
                type="text"
                value={formData.target_users}
                onChange={(e) => setFormData({ ...formData, target_users: e.target.value })}
                placeholder="Who benefits?"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="api, frontend, auth"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Success Metrics</label>
            <textarea
              value={formData.success_metrics}
              onChange={(e) => setFormData({ ...formData, success_metrics: e.target.value })}
              placeholder="How will we measure success?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technical Notes</label>
            <textarea
              value={formData.technical_notes}
              onChange={(e) => setFormData({ ...formData, technical_notes: e.target.value })}
              placeholder="Technical considerations, dependencies..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (isEdit) setEditingFeature(null); else setShowNewFeature(false); resetForm() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const AIModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Generate Feature with AI</h2>
          </div>
          <button onClick={() => setShowAIModal(false)} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe the feature you want to create
          </label>
          <textarea
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            placeholder="E.g., A user authentication system with SSO support for Google and GitHub, including session management and remember me functionality..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAIModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAIGenerate}
              disabled={!aiDescription.trim() || generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles size={16} />
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-gray-900">Features</h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FeatureStatus | 'all')}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              {Object.entries(FEATURE_STATUS_META).map(([status, meta]) => (
                <option key={status} value={status}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {github && (
            <button
              onClick={() => setShowDiscoveryModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
            >
              <GitBranch size={16} />
              Discover from GitHub
            </button>
          )}
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Sparkles size={16} />
            AI Generate
          </button>
          <button
            onClick={() => { resetForm(); setShowNewFeature(true) }}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Feature
          </button>
        </div>
      </div>

      {filteredFeatures.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Lightbulb size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No features {filterStatus !== 'all' ? 'match filters' : 'yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {filterStatus !== 'all' ? 'Try adjusting your filters' : 'Create feature specifications for your project'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeatures.map((feature) => {
            const statusMeta = FEATURE_STATUS_META[feature.status]
            const priorityMeta = FEATURE_PRIORITY_META[feature.priority]
            const isExpanded = expandedFeature === feature.id

            return (
              <div key={feature.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-gray-400" />
                        <h3 className="font-medium text-gray-900">{feature.title}</h3>
                      </div>
                      {feature.problem && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{feature.problem}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${statusMeta.bg} ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        <span className={`text-xs ${priorityMeta.color}`}>{priorityMeta.label}</span>
                        {feature.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs text-gray-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={feature.status}
                        onChange={(e) => handleStatusChange(feature.id, e.target.value as FeatureStatus)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                      >
                        {Object.entries(FEATURE_STATUS_META).map(([status, meta]) => (
                          <option key={status} value={status}>{meta.label}</option>
                        ))}
                      </select>
                      <button onClick={() => openEditModal(feature)} className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedFeature(isExpanded ? null : feature.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => handleDelete(feature.id)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {feature.solution && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Solution</h4>
                        <p className="text-sm text-gray-700">{feature.solution}</p>
                      </div>
                    )}
                    {feature.target_users && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Target Users</h4>
                        <p className="text-sm text-gray-700">{feature.target_users}</p>
                      </div>
                    )}
                    {feature.success_metrics && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Success Metrics</h4>
                        <p className="text-sm text-gray-700">{feature.success_metrics}</p>
                      </div>
                    )}
                    {feature.technical_notes && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Technical Notes</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{feature.technical_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showNewFeature && <FeatureModal isEdit={false} />}
      {editingFeature && <FeatureModal isEdit={true} />}
      {showAIModal && <AIModal />}
      {showDiscoveryModal && github && (
        <FeatureDiscoveryModal
          projectId={projectId}
          github={github}
          onClose={() => setShowDiscoveryModal(false)}
          onComplete={onUpdate}
        />
      )}
    </div>
  )
}

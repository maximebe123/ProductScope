/**
 * Decisions Tab
 * Document important decisions and their rationale in a project
 */

import { useState } from 'react'
import { Plus, Lightbulb, X, Filter, Edit3, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { decisionApi, type Decision, type DecisionStatus, type AlternativeOption } from '../../../services/projectApi'
import { DECISION_STATUS_META } from '../constants'

export interface DecisionsTabProps {
  projectId: string
  decisions: Decision[]
  onUpdate: () => void
}

export function DecisionsTab({ projectId, decisions, onUpdate }: DecisionsTabProps) {
  const [showNewDecision, setShowNewDecision] = useState(false)
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null)
  const [filterStatus, setFilterStatus] = useState<DecisionStatus | 'all'>('all')
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rationale: '',
    affected_areas: '',
    alternatives: [] as AlternativeOption[],
    newAlternative: { option: '', pros: '', cons: '' },
  })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      rationale: '',
      affected_areas: '',
      alternatives: [],
      newAlternative: { option: '', pros: '', cons: '' },
    })
  }

  const openEditModal = (decision: Decision) => {
    setEditingDecision(decision)
    setFormData({
      title: decision.title,
      description: decision.description,
      rationale: decision.rationale || '',
      affected_areas: decision.affected_areas.join(', '),
      alternatives: decision.alternatives || [],
      newAlternative: { option: '', pros: '', cons: '' },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) return

    try {
      setSaving(true)
      const data = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        rationale: formData.rationale.trim() || undefined,
        affected_areas: formData.affected_areas
          ? formData.affected_areas.split(',').map(a => a.trim()).filter(Boolean)
          : [],
        alternatives: formData.alternatives,
      }

      if (editingDecision) {
        await decisionApi.update(projectId, editingDecision.id, data)
        setEditingDecision(null)
      } else {
        await decisionApi.create(projectId, data)
        setShowNewDecision(false)
      }
      resetForm()
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save decision')
    } finally {
      setSaving(false)
    }
  }

  const addAlternative = () => {
    if (!formData.newAlternative.option.trim()) return
    setFormData({
      ...formData,
      alternatives: [
        ...formData.alternatives,
        {
          option: formData.newAlternative.option.trim(),
          pros: formData.newAlternative.pros.split(',').map(p => p.trim()).filter(Boolean),
          cons: formData.newAlternative.cons.split(',').map(c => c.trim()).filter(Boolean),
        },
      ],
      newAlternative: { option: '', pros: '', cons: '' },
    })
  }

  const removeAlternative = (index: number) => {
    setFormData({
      ...formData,
      alternatives: formData.alternatives.filter((_, i) => i !== index),
    })
  }

  const handleApprove = async (decisionId: string) => {
    try {
      await decisionApi.approve(projectId, decisionId)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve decision')
    }
  }

  const handleReject = async (decisionId: string) => {
    try {
      await decisionApi.update(projectId, decisionId, { status: 'rejected' })
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject decision')
    }
  }

  const handleDelete = async (decisionId: string) => {
    if (!confirm('Delete this decision?')) return
    try {
      await decisionApi.delete(projectId, decisionId)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete decision')
    }
  }

  const filteredDecisions = decisions.filter(d => {
    if (filterStatus === 'all') return true
    return d.status === filterStatus
  })

  const DecisionModal = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Decision' : 'Record New Decision'}
          </h2>
          <button
            onClick={() => { if (isEdit) setEditingDecision(null); else setShowNewDecision(false); resetForm() }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Decision Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Short title for this decision"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What was decided? *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the decision that was made"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Rationale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rationale
              <span className="text-gray-400 font-normal ml-1">(why this choice?)</span>
            </label>
            <textarea
              value={formData.rationale}
              onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
              placeholder="Why was this decision made? What factors influenced it?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
            />
          </div>

          {/* Affected Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Affected Areas
              <span className="text-gray-400 font-normal ml-1">(comma separated)</span>
            </label>
            <input
              type="text"
              value={formData.affected_areas}
              onChange={(e) => setFormData({ ...formData, affected_areas: e.target.value })}
              placeholder="architecture, api, frontend, database..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>

          {/* Alternatives Considered */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alternatives Considered</label>
            <div className="space-y-3">
              {formData.alternatives.map((alt, index) => (
                <div key={index} className="p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{alt.option}</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {alt.pros.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500">Pros:</span>
                            <ul className="text-xs text-gray-600 mt-1">
                              {alt.pros.map((pro, i) => (
                                <li key={i}>+ {pro}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {alt.cons.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500">Cons:</span>
                            <ul className="text-xs text-gray-600 mt-1">
                              {alt.cons.map((con, i) => (
                                <li key={i}>- {con}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAlternative(index)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="p-3 border border-dashed border-gray-200 rounded-lg">
                <input
                  type="text"
                  value={formData.newAlternative.option}
                  onChange={(e) => setFormData({ ...formData, newAlternative: { ...formData.newAlternative, option: e.target.value } })}
                  placeholder="Alternative option name"
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.newAlternative.pros}
                    onChange={(e) => setFormData({ ...formData, newAlternative: { ...formData.newAlternative, pros: e.target.value } })}
                    placeholder="Pros (comma separated)"
                    className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  <input
                    type="text"
                    value={formData.newAlternative.cons}
                    onChange={(e) => setFormData({ ...formData, newAlternative: { ...formData.newAlternative, cons: e.target.value } })}
                    placeholder="Cons (comma separated)"
                    className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={addAlternative}
                  disabled={!formData.newAlternative.option.trim()}
                  className="mt-2 px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Add Alternative
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (isEdit) setEditingDecision(null); else setShowNewDecision(false); resetForm() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || !formData.description.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Record Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-gray-900">Decisions</h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DecisionStatus | 'all')}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              {Object.entries(DECISION_STATUS_META).map(([status, meta]) => (
                <option key={status} value={status}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewDecision(true) }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Decision
        </button>
      </div>

      {filteredDecisions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Lightbulb size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {filterStatus !== 'all' ? 'No decisions match filter' : 'No decisions yet'}
          </h3>
          <p className="text-gray-500">
            {filterStatus !== 'all' ? 'Try adjusting your filter' : 'Document important decisions and their rationale'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDecisions.map((decision) => {
            const statusMeta = DECISION_STATUS_META[decision.status]
            const isExpanded = expandedDecision === decision.id
            const hasAlternatives = decision.alternatives && decision.alternatives.length > 0

            return (
              <div key={decision.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 p-4 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Lightbulb size={16} className="text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{decision.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${statusMeta.bg} ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{decision.description}</p>
                      {decision.rationale && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-xs text-gray-500">Rationale:</span>
                          <p className="text-sm text-gray-700 mt-0.5">{decision.rationale}</p>
                        </div>
                      )}
                      {decision.affected_areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-xs text-gray-400">Affects:</span>
                          {decision.affected_areas.map((area) => (
                            <span key={area} className="text-xs text-gray-500">{area}</span>
                          ))}
                        </div>
                      )}
                      {decision.decided_at && (
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(decision.decided_at).toLocaleDateString()}
                          {decision.decided_by && ` by ${decision.decided_by}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {decision.status === 'proposed' && (
                      <>
                        <button
                          onClick={() => handleApprove(decision.id)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(decision.id)}
                          className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button onClick={() => openEditModal(decision)} className="p-1 text-gray-400 hover:text-gray-600">
                      <Edit3 size={14} />
                    </button>
                    {hasAlternatives && (
                      <button
                        onClick={() => setExpandedDecision(isExpanded ? null : decision.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    <button onClick={() => handleDelete(decision.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && hasAlternatives && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-medium text-gray-500 mb-3">Alternatives Considered</h4>
                    <div className="grid gap-3">
                      {decision.alternatives.map((alt, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <h5 className="font-medium text-gray-800 text-sm">{alt.option}</h5>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            {alt.pros.length > 0 && (
                              <div>
                                <span className="text-xs text-gray-500 font-medium">Pros</span>
                                <ul className="mt-1 space-y-1">
                                  {alt.pros.map((pro, i) => (
                                    <li key={i} className="text-xs text-gray-600">+ {pro}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {alt.cons.length > 0 && (
                              <div>
                                <span className="text-xs text-gray-500 font-medium">Cons</span>
                                <ul className="mt-1 space-y-1">
                                  {alt.cons.map((con, i) => (
                                    <li key={i} className="text-xs text-gray-600">- {con}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showNewDecision && <DecisionModal isEdit={false} />}
      {editingDecision && <DecisionModal isEdit={true} />}
    </div>
  )
}

/**
 * KPIs Tab
 * Business KPIs for application valorization
 */

import { useState } from 'react'
import {
  Plus,
  Trash2,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  Target,
  GitBranch,
  Calculator,
  Database,
  BarChart3,
} from 'lucide-react'
import {
  kpiApi,
  type KPI,
  type KPIStatus,
  type KPIPriority,
  type KPICategory,
  type GitHubAttachment,
} from '../../../services/projectApi'
import { KPIDiscoveryModal } from '../components/KPIDiscoveryModal'

const KPI_STATUS_META: Record<KPIStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  defined: { label: 'Defined', color: 'text-blue-600', bg: 'bg-blue-100' },
  tracking: { label: 'Tracking', color: 'text-green-600', bg: 'bg-green-100' },
  archived: { label: 'Archived', color: 'text-gray-500', bg: 'bg-gray-100' },
}

const KPI_PRIORITY_META: Record<KPIPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-400' },
  medium: { label: 'Medium', color: 'text-gray-500' },
  high: { label: 'High', color: 'text-orange-500' },
  critical: { label: 'Critical', color: 'text-red-500' },
}

const KPI_CATEGORY_META: Record<KPICategory, { label: string; color: string; bg: string; icon: typeof TrendingUp }> = {
  efficiency: { label: 'Efficiency', color: 'text-blue-600', bg: 'bg-blue-100', icon: TrendingUp },
  quality: { label: 'Quality', color: 'text-green-600', bg: 'bg-green-100', icon: Target },
  adoption: { label: 'Adoption', color: 'text-purple-600', bg: 'bg-purple-100', icon: BarChart3 },
  revenue: { label: 'Revenue', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: TrendingUp },
  satisfaction: { label: 'Satisfaction', color: 'text-pink-600', bg: 'bg-pink-100', icon: Target },
  growth: { label: 'Growth', color: 'text-indigo-600', bg: 'bg-indigo-100', icon: TrendingUp },
  operational: { label: 'Operational', color: 'text-amber-600', bg: 'bg-amber-100', icon: BarChart3 },
}

export interface KPIsTabProps {
  projectId: string
  kpis: KPI[]
  onUpdate: () => void
  github?: GitHubAttachment
}

export function KPIsTab({ projectId, kpis, onUpdate, github }: KPIsTabProps) {
  const [showNewKPI, setShowNewKPI] = useState(false)
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null)
  const [filterStatus, setFilterStatus] = useState<KPIStatus | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<KPICategory | 'all'>('all')
  const [expandedKPI, setExpandedKPI] = useState<string | null>(null)
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    definition: '',
    category: 'efficiency' as KPICategory,
    calculation_method: '',
    data_sources: '',
    unit: '',
    frequency: 'monthly',
    target_guidance: '',
    business_value: '',
    priority: 'medium' as KPIPriority,
    tags: '',
  })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormData({
      name: '',
      definition: '',
      category: 'efficiency',
      calculation_method: '',
      data_sources: '',
      unit: '',
      frequency: 'monthly',
      target_guidance: '',
      business_value: '',
      priority: 'medium',
      tags: '',
    })
  }

  const openEditModal = (kpi: KPI) => {
    setEditingKPI(kpi)
    setFormData({
      name: kpi.name,
      definition: kpi.definition,
      category: kpi.category,
      calculation_method: kpi.calculation_method || '',
      data_sources: kpi.data_sources.join(', '),
      unit: kpi.unit || '',
      frequency: kpi.frequency || 'monthly',
      target_guidance: kpi.target_guidance || '',
      business_value: kpi.business_value || '',
      priority: kpi.priority,
      tags: kpi.tags.join(', '),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.definition.trim()) return

    try {
      setSaving(true)
      const data = {
        name: formData.name.trim(),
        definition: formData.definition.trim(),
        category: formData.category,
        calculation_method: formData.calculation_method.trim() || undefined,
        data_sources: formData.data_sources ? formData.data_sources.split(',').map(s => s.trim()).filter(Boolean) : [],
        unit: formData.unit.trim() || undefined,
        frequency: formData.frequency.trim() || undefined,
        target_guidance: formData.target_guidance.trim() || undefined,
        business_value: formData.business_value.trim() || undefined,
        priority: formData.priority,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }

      if (editingKPI) {
        await kpiApi.update(projectId, editingKPI.id, data)
        setEditingKPI(null)
      } else {
        await kpiApi.create(projectId, data)
        setShowNewKPI(false)
      }
      resetForm()
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save KPI')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (kpiId: string) => {
    if (!confirm('Delete this KPI?')) return
    try {
      await kpiApi.delete(projectId, kpiId)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete KPI')
    }
  }

  const handleStatusChange = async (kpiId: string, status: KPIStatus) => {
    try {
      await kpiApi.update(projectId, kpiId, { status })
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update KPI')
    }
  }

  const filteredKPIs = kpis.filter(k => {
    if (filterStatus !== 'all' && k.status !== filterStatus) return false
    if (filterCategory !== 'all' && k.category !== filterCategory) return false
    return true
  })

  const KPIModal = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit KPI' : 'Create New KPI'}
          </h2>
          <button
            onClick={() => { if (isEdit) setEditingKPI(null); else setShowNewKPI(false); resetForm() }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Customer Conversion Rate"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as KPICategory })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(KPI_CATEGORY_META).map(([cat, meta]) => (
                  <option key={cat} value={cat}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as KPIPriority })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(KPI_PRIORITY_META).map(([priority, meta]) => (
                  <option key={priority} value={priority}>{meta.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Definition *</label>
            <textarea
              value={formData.definition}
              onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
              placeholder="What does this KPI measure?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Method</label>
            <textarea
              value={formData.calculation_method}
              onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value })}
              placeholder="Formula or methodology (e.g., Converted users / Total users * 100)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="%, count, time"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="realtime">Realtime</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="sales, retention"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Sources</label>
            <input
              type="text"
              value={formData.data_sources}
              onChange={(e) => setFormData({ ...formData, data_sources: e.target.value })}
              placeholder="users table, orders API, analytics events (comma separated)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Guidance</label>
            <input
              type="text"
              value={formData.target_guidance}
              onChange={(e) => setFormData({ ...formData, target_guidance: e.target.value })}
              placeholder="What is a 'good' value? (e.g., >70% is excellent)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Value</label>
            <textarea
              value={formData.business_value}
              onChange={(e) => setFormData({ ...formData, business_value: e.target.value })}
              placeholder="How does this KPI valorize the application?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (isEdit) setEditingKPI(null); else setShowNewKPI(false); resetForm() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || !formData.definition.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create KPI'}
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
          <h2 className="text-lg font-medium text-gray-900">KPIs</h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as KPIStatus | 'all')}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              {Object.entries(KPI_STATUS_META).map(([status, meta]) => (
                <option key={status} value={status}>{meta.label}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as KPICategory | 'all')}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="all">All Categories</option>
              {Object.entries(KPI_CATEGORY_META).map(([cat, meta]) => (
                <option key={cat} value={cat}>{meta.label}</option>
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
            onClick={() => { resetForm(); setShowNewKPI(true) }}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New KPI
          </button>
        </div>
      </div>

      {filteredKPIs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No KPIs {filterStatus !== 'all' || filterCategory !== 'all' ? 'match filters' : 'yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {filterStatus !== 'all' || filterCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'Define business KPIs to valorize your application'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKPIs.map((kpi) => {
            const statusMeta = KPI_STATUS_META[kpi.status]
            const priorityMeta = KPI_PRIORITY_META[kpi.priority]
            const categoryMeta = KPI_CATEGORY_META[kpi.category]
            const isExpanded = expandedKPI === kpi.id
            const CategoryIcon = categoryMeta.icon

            return (
              <div key={kpi.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CategoryIcon size={14} className={categoryMeta.color} />
                        <h3 className="font-medium text-gray-900">{kpi.name}</h3>
                        {kpi.unit && (
                          <span className="text-xs text-gray-400">({kpi.unit})</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{kpi.definition}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${categoryMeta.bg} ${categoryMeta.color}`}>
                          {categoryMeta.label}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${statusMeta.bg} ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        <span className={`text-xs ${priorityMeta.color}`}>{priorityMeta.label}</span>
                        {kpi.frequency && (
                          <span className="text-xs text-gray-400">{kpi.frequency}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={kpi.status}
                        onChange={(e) => handleStatusChange(kpi.id, e.target.value as KPIStatus)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                      >
                        {Object.entries(KPI_STATUS_META).map(([status, meta]) => (
                          <option key={status} value={status}>{meta.label}</option>
                        ))}
                      </select>
                      <button onClick={() => openEditModal(kpi)} className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedKPI(isExpanded ? null : kpi.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => handleDelete(kpi.id)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {kpi.calculation_method && (
                      <div className="flex items-start gap-2">
                        <Calculator size={14} className="text-gray-400 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 mb-1">Calculation Method</h4>
                          <p className="text-sm text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded">{kpi.calculation_method}</p>
                        </div>
                      </div>
                    )}
                    {kpi.data_sources.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Database size={14} className="text-gray-400 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 mb-1">Data Sources</h4>
                          <div className="flex flex-wrap gap-1">
                            {kpi.data_sources.map((src, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{src}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {kpi.target_guidance && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Target Guidance</h4>
                        <p className="text-sm text-gray-700">{kpi.target_guidance}</p>
                      </div>
                    )}
                    {kpi.business_value && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Business Value</h4>
                        <p className="text-sm text-gray-700">{kpi.business_value}</p>
                      </div>
                    )}
                    {kpi.impact_areas.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">Impact Areas</h4>
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
          })}
        </div>
      )}

      {/* Modals */}
      {showNewKPI && <KPIModal isEdit={false} />}
      {editingKPI && <KPIModal isEdit={true} />}
      {showDiscoveryModal && github && (
        <KPIDiscoveryModal
          projectId={projectId}
          github={github}
          onClose={() => setShowDiscoveryModal(false)}
          onComplete={onUpdate}
        />
      )}
    </div>
  )
}

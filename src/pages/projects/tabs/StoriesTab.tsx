/**
 * Stories Tab
 * User stories management with filtering, CRUD operations, and acceptance criteria
 */

import { useState } from 'react'
import {
  Plus,
  Trash2,
  FileText,
  Filter,
  Target,
  Zap,
  Bug,
  Wrench,
  Search,
  ChevronDown,
  ChevronUp,
  Edit3,
  CheckCircle2,
  X,
} from 'lucide-react'
import {
  storyApi,
  type Story,
  type StoryStatus,
  type StoryPriority,
  type StoryType,
} from '../../../services/projectApi'
import { STORY_STATUS_META } from '../constants'

const STORY_PRIORITY_META: Record<StoryPriority, { label: string; color: string; icon: typeof Zap }> = {
  low: { label: 'Low', color: 'text-gray-400', icon: ChevronDown },
  medium: { label: 'Medium', color: 'text-gray-500', icon: Target },
  high: { label: 'High', color: 'text-gray-600', icon: ChevronUp },
  critical: { label: 'Critical', color: 'text-gray-700', icon: Zap },
}

const STORY_TYPE_META: Record<StoryType, { label: string; icon: typeof FileText }> = {
  user_story: { label: 'User Story', icon: FileText },
  bug: { label: 'Bug', icon: Bug },
  technical: { label: 'Technical', icon: Wrench },
  spike: { label: 'Spike', icon: Search },
}

export interface StoriesTabProps {
  projectId: string
  stories: Story[]
  onUpdate: () => void
}

export function StoriesTab({ projectId, stories, onUpdate }: StoriesTabProps) {
  const [showNewStory, setShowNewStory] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [filterStatus, setFilterStatus] = useState<StoryStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<StoryType | 'all'>('all')
  const [expandedStory, setExpandedStory] = useState<string | null>(null)

  // Form state for new/edit story
  const [formData, setFormData] = useState({
    title: '',
    as_a: '',
    i_want: '',
    so_that: '',
    story_type: 'user_story' as StoryType,
    priority: 'medium' as StoryPriority,
    story_points: '',
    tags: '',
    acceptance_criteria: [] as Array<{ id: string; criterion: string; status: string }>,
    newCriterion: '',
  })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormData({
      title: '',
      as_a: '',
      i_want: '',
      so_that: '',
      story_type: 'user_story',
      priority: 'medium',
      story_points: '',
      tags: '',
      acceptance_criteria: [],
      newCriterion: '',
    })
  }

  const openEditModal = (story: Story) => {
    setEditingStory(story)
    setFormData({
      title: story.title,
      as_a: story.as_a || '',
      i_want: story.i_want || '',
      so_that: story.so_that || '',
      story_type: story.story_type,
      priority: story.priority,
      story_points: story.story_points?.toString() || '',
      tags: story.tags.join(', '),
      acceptance_criteria: story.acceptance_criteria || [],
      newCriterion: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      setSaving(true)
      const data = {
        title: formData.title.trim(),
        as_a: formData.as_a.trim() || undefined,
        i_want: formData.i_want.trim() || undefined,
        so_that: formData.so_that.trim() || undefined,
        story_type: formData.story_type,
        priority: formData.priority,
        story_points: formData.story_points ? parseInt(formData.story_points) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        acceptance_criteria: formData.acceptance_criteria,
      }

      if (editingStory) {
        await storyApi.update(projectId, editingStory.id, data)
        setEditingStory(null)
      } else {
        await storyApi.create(projectId, data)
        setShowNewStory(false)
      }
      resetForm()
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save story')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (storyId: string) => {
    if (!confirm('Delete this story?')) return
    try {
      await storyApi.delete(projectId, storyId)
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete story')
    }
  }

  const handleStatusChange = async (storyId: string, status: StoryStatus) => {
    try {
      await storyApi.update(projectId, storyId, { status })
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update story')
    }
  }

  const addCriterion = () => {
    if (!formData.newCriterion.trim()) return
    setFormData({
      ...formData,
      acceptance_criteria: [
        ...formData.acceptance_criteria,
        { id: crypto.randomUUID(), criterion: formData.newCriterion.trim(), status: 'pending' },
      ],
      newCriterion: '',
    })
  }

  const toggleCriterionStatus = (criterionId: string) => {
    setFormData({
      ...formData,
      acceptance_criteria: formData.acceptance_criteria.map(c =>
        c.id === criterionId
          ? { ...c, status: c.status === 'done' ? 'pending' : 'done' }
          : c
      ),
    })
  }

  const removeCriterion = (criterionId: string) => {
    setFormData({
      ...formData,
      acceptance_criteria: formData.acceptance_criteria.filter(c => c.id !== criterionId),
    })
  }

  const toggleCriterionOnStory = async (story: Story, criterionId: string) => {
    const updatedCriteria = story.acceptance_criteria.map(c =>
      c.id === criterionId
        ? { ...c, status: c.status === 'done' ? 'pending' : 'done' }
        : c
    )
    try {
      await storyApi.update(projectId, story.id, { acceptance_criteria: updatedCriteria })
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const filteredStories = stories.filter(story => {
    if (filterStatus !== 'all' && story.status !== filterStatus) return false
    if (filterType !== 'all' && story.story_type !== filterType) return false
    return true
  })

  const StoryModal = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Story' : 'Create New Story'}
          </h2>
          <button
            onClick={() => { if (isEdit) setEditingStory(null); else setShowNewStory(false); resetForm() }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Short descriptive title"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              autoFocus
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.story_type}
                onChange={(e) => setFormData({ ...formData, story_type: e.target.value as StoryType })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(STORY_TYPE_META).map(([type, meta]) => (
                  <option key={type} value={type}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as StoryPriority })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(STORY_PRIORITY_META).map(([priority, meta]) => (
                  <option key={priority} value={priority}>{meta.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* User Story Format */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">User Story Format</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-16">As a</span>
                <input
                  type="text"
                  value={formData.as_a}
                  onChange={(e) => setFormData({ ...formData, as_a: e.target.value })}
                  placeholder="user role"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-16">I want</span>
                <input
                  type="text"
                  value={formData.i_want}
                  onChange={(e) => setFormData({ ...formData, i_want: e.target.value })}
                  placeholder="feature or capability"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-16">So that</span>
                <input
                  type="text"
                  value={formData.so_that}
                  onChange={(e) => setFormData({ ...formData, so_that: e.target.value })}
                  placeholder="benefit or value"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Story Points and Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Story Points</label>
              <input
                type="number"
                min="1"
                max="21"
                value={formData.story_points}
                onChange={(e) => setFormData({ ...formData, story_points: e.target.value })}
                placeholder="1, 2, 3, 5, 8, 13..."
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

          {/* Acceptance Criteria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Acceptance Criteria</label>
            <div className="space-y-2">
              {formData.acceptance_criteria.map((criterion) => (
                <div key={criterion.id} className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => toggleCriterionStatus(criterion.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <CheckCircle2 size={16} className={criterion.status === 'done' ? 'text-gray-500' : ''} />
                  </button>
                  <span className={`flex-1 text-sm ${criterion.status === 'done' ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                    {criterion.criterion}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCriterion(criterion.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.newCriterion}
                  onChange={(e) => setFormData({ ...formData, newCriterion: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCriterion())}
                  placeholder="Add acceptance criterion..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={addCriterion}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { if (isEdit) setEditingStory(null); else setShowNewStory(false); resetForm() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Story'}
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
          <h2 className="text-lg font-medium text-gray-900">User Stories</h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StoryStatus | 'all')}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              {Object.entries(STORY_STATUS_META).map(([status, meta]) => (
                <option key={status} value={status}>{meta.label}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as StoryType | 'all')}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <option value="all">All Types</option>
              {Object.entries(STORY_TYPE_META).map(([type, meta]) => (
                <option key={type} value={type}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewStory(true) }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Story
        </button>
      </div>

      {filteredStories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No stories {filterStatus !== 'all' || filterType !== 'all' ? 'match filters' : 'yet'}</h3>
          <p className="text-gray-500 mb-4">
            {filterStatus !== 'all' || filterType !== 'all' ? 'Try adjusting your filters' : 'Create user stories for your project'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStories.map((story) => {
            const statusMeta = STORY_STATUS_META[story.status]
            const priorityMeta = STORY_PRIORITY_META[story.priority]
            const typeMeta = STORY_TYPE_META[story.story_type]
            const TypeIcon = typeMeta.icon
            const isExpanded = expandedStory === story.id
            const completedCriteria = story.acceptance_criteria.filter(c => c.status === 'done').length
            const totalCriteria = story.acceptance_criteria.length

            return (
              <div key={story.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <TypeIcon size={14} className="text-gray-400" />
                        <h3 className="font-medium text-gray-900">{story.title}</h3>
                        {story.story_points && (
                          <span className="text-xs text-gray-400">{story.story_points} pts</span>
                        )}
                      </div>
                      {story.as_a && story.i_want && (
                        <p className="text-sm text-gray-500 mt-1">
                          As a <span className="font-medium">{story.as_a}</span>, I want <span className="font-medium">{story.i_want}</span>
                          {story.so_that && <>, so that <span className="font-medium">{story.so_that}</span></>}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${statusMeta.bg} ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        <span className={`text-xs ${priorityMeta.color}`}>{priorityMeta.label}</span>
                        {totalCriteria > 0 && (
                          <span className="text-xs text-gray-400">{completedCriteria}/{totalCriteria} criteria</span>
                        )}
                        {story.tags.length > 0 && story.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs text-gray-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={story.status}
                        onChange={(e) => handleStatusChange(story.id, e.target.value as StoryStatus)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                      >
                        {Object.entries(STORY_STATUS_META).map(([status, meta]) => (
                          <option key={status} value={status}>{meta.label}</option>
                        ))}
                      </select>
                      <button onClick={() => openEditModal(story)} className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit3 size={14} />
                      </button>
                      {totalCriteria > 0 && (
                        <button
                          onClick={() => setExpandedStory(isExpanded ? null : story.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      <button onClick={() => handleDelete(story.id)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                {isExpanded && totalCriteria > 0 && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">Acceptance Criteria</h4>
                    <div className="space-y-1">
                      {story.acceptance_criteria.map((criterion) => (
                        <div
                          key={criterion.id}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                          onClick={() => toggleCriterionOnStory(story, criterion.id)}
                        >
                          <CheckCircle2 size={14} className={criterion.status === 'done' ? 'text-gray-500' : 'text-gray-300'} />
                          <span className={criterion.status === 'done' ? 'line-through text-gray-400' : 'text-gray-600'}>
                            {criterion.criterion}
                          </span>
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
      {showNewStory && <StoryModal isEdit={false} />}
      {editingStory && <StoryModal isEdit={true} />}
    </div>
  )
}

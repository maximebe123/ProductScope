/**
 * Projects List Page
 * Displays all projects with search, filter, and create functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  FolderOpen,
  MoreHorizontal,
  Trash2,
  Archive,
  Clock,
  LayoutGrid,
  List,
  Filter,
  Network,
  FileText,
  HelpCircle,
  Lightbulb,
  GitBranch,
} from 'lucide-react'
import { projectApi, type Project, type ProjectStatus } from '../../services/projectApi'
import { GitHubImportModal } from '../../components/GitHub'
import { CreateProjectModal } from './components'
import { formatDate } from '../../shared/utils/dateFormat'

type ViewMode = 'grid' | 'list'

const STATUS_STYLES: Record<ProjectStatus, { badge: string; border: string; bar: string }> = {
  draft: {
    badge: 'bg-slate-100 text-slate-600',
    border: 'border-t-slate-300',
    bar: 'bg-slate-300',
  },
  active: {
    badge: 'bg-emerald-50 text-emerald-700',
    border: 'border-t-emerald-400',
    bar: 'bg-emerald-400',
  },
  archived: {
    badge: 'bg-amber-50 text-amber-700',
    border: 'border-t-amber-400',
    bar: 'bg-amber-400',
  },
  completed: {
    badge: 'bg-blue-50 text-blue-700',
    border: 'border-t-blue-400',
    bar: 'bg-blue-400',
  },
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
  completed: 'Completed',
}

export function ProjectsListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showGitHubImport, setShowGitHubImport] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await projectApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      })
      setProjects(response.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    try {
      await projectApi.delete(id)
      setProjects(projects.filter((p) => p.id !== id))
      setMenuOpen(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  const handleArchive = async (id: string) => {
    try {
      const updated = await projectApi.update(id, { status: 'archived' })
      setProjects(projects.map((p) => (p.id === id ? updated : p)))
      setMenuOpen(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive project')
    }
  }

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Projets</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gérez vos diagrammes, stories et documentation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGitHubImport(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg
                         hover:bg-gray-800 transition-colors font-medium text-sm"
              >
                <GitBranch size={18} />
                Import GitHub
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg
                         hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                <Plus size={18} />
                Nouveau projet
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mt-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Rechercher des projets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30
                         text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="completed">Terminé</option>
                <option value="archived">Archivé</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadProjects}
              className="text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No projects yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first project to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg
                       hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              Create Project
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const statusStyle = STATUS_STYLES[project.status]
              const hasContent = (project.diagram_count ?? 0) > 0 ||
                               (project.story_count ?? 0) > 0 ||
                               (project.question_count ?? 0) > 0 ||
                               (project.decision_count ?? 0) > 0

              return (
                <div
                  key={project.id}
                  className={`bg-white rounded-xl border border-gray-200 border-t-4 ${statusStyle.border}
                           hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group`}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${statusStyle.badge}`}>
                        {STATUS_LABELS[project.status]}
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === project.id ? null : project.id)
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreHorizontal size={16} className="text-gray-400" />
                        </button>
                        {menuOpen === project.id && (
                          <div
                            className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200
                                     shadow-xl py-1 min-w-[140px] z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleArchive(project.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Archive size={14} />
                              Archive
                            </button>
                            <button
                              onClick={() => handleDelete(project.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[40px]">
                      {project.description || 'No description'}
                    </p>

                    {/* Metadata section */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock size={13} />
                          {formatDate(project.updated_at)}
                        </span>

                        {hasContent && (
                          <div className="flex items-center gap-2">
                            {(project.diagram_count ?? 0) > 0 && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500" title="Diagrams">
                                <Network size={13} />
                                {project.diagram_count}
                              </span>
                            )}
                            {(project.story_count ?? 0) > 0 && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500" title="Stories">
                                <FileText size={13} />
                                {project.story_count}
                              </span>
                            )}
                            {(project.question_count ?? 0) > 0 && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500" title="Questions">
                                <HelpCircle size={13} />
                                {project.question_count}
                              </span>
                            )}
                            {(project.decision_count ?? 0) > 0 && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500" title="Decisions">
                                <Lightbulb size={13} />
                                {project.decision_count}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {projects.map((project) => {
              const statusStyle = STATUS_STYLES[project.status]
              return (
                <div
                  key={project.id}
                  className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0
                           hover:bg-gray-50 cursor-pointer group transition-colors"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {/* Status indicator bar */}
                  <div className={`w-1 h-12 rounded-full ${statusStyle.bar}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusStyle.badge}`}>
                        {STATUS_LABELS[project.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {project.description || 'No description'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(project.diagram_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500" title="Diagrams">
                        <Network size={13} />
                        {project.diagram_count}
                      </span>
                    )}
                    {(project.story_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500" title="Stories">
                        <FileText size={13} />
                        {project.story_count}
                      </span>
                    )}
                    {(project.question_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500" title="Questions">
                        <HelpCircle size={13} />
                        {project.question_count}
                      </span>
                    )}
                    {(project.decision_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-500" title="Decisions">
                        <Lightbulb size={13} />
                        {project.decision_count}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 ml-4">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      {formatDate(project.updated_at)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleArchive(project.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(project.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600
                                 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(project) => {
            setProjects([project, ...projects])
            setShowCreateModal(false)
            navigate(`/projects/${project.id}`)
          }}
        />
      )}

      {/* GitHub Import Modal */}
      <GitHubImportModal
        isOpen={showGitHubImport}
        onClose={() => setShowGitHubImport(false)}
        onComplete={(projectId) => {
          setShowGitHubImport(false)
          loadProjects()
          navigate(`/projects/${projectId}`)
        }}
      />
    </div>
  )
}

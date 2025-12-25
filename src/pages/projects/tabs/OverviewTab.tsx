/**
 * Project Overview Tab
 * Shows project stats, recent diagrams, and details
 */

import { useNavigate } from 'react-router-dom'
import { Network, FileText, MessageSquare, GitBranch, TrendingUp } from 'lucide-react'
import type { Project, DiagramListItem, KPI } from '../../../services/projectApi'
import { DIAGRAM_TYPE_META, getDiagramRoute } from '../constants'
import { GitHubLink } from '../../../components/GitHub'

const KPI_CATEGORY_COLORS: Record<string, string> = {
  efficiency: 'bg-blue-100 text-blue-700',
  quality: 'bg-green-100 text-green-700',
  adoption: 'bg-purple-100 text-purple-700',
  revenue: 'bg-yellow-100 text-yellow-700',
  satisfaction: 'bg-pink-100 text-pink-700',
  growth: 'bg-cyan-100 text-cyan-700',
  operational: 'bg-orange-100 text-orange-700',
}

export interface OverviewTabProps {
  project: Project
  diagrams: DiagramListItem[]
  kpis?: KPI[]
  onViewDiagrams: () => void
  onViewKPIs?: () => void
  onLinkGitHub?: () => void
  onUnlinkGitHub?: () => void
}

export function OverviewTab({ project, diagrams, kpis = [], onViewDiagrams, onViewKPIs, onLinkGitHub, onUnlinkGitHub }: OverviewTabProps) {
  const navigate = useNavigate()

  // Get top KPIs by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const topKpis = [...kpis]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 4)

  const handleOpenDiagram = (diagram: DiagramListItem) => {
    navigate(getDiagramRoute(diagram.diagram_type, project.id, diagram.id))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Diagrams', value: diagrams.length, icon: Network },
            { label: 'Stories', value: project.story_count || 0, icon: FileText },
            { label: 'Questions', value: project.question_count || 0, icon: MessageSquare },
            { label: 'Transcripts', value: project.transcript_count || 0, icon: FileText },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <stat.icon size={20} className="text-gray-400 mb-2" />
              <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Diagrams */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Recent Diagrams</h3>
            {diagrams.length > 0 && (
              <button onClick={onViewDiagrams} className="text-sm text-primary hover:underline">
                View all
              </button>
            )}
          </div>
          {diagrams.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Network size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No diagrams yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {diagrams.slice(0, 5).map((diagram) => {
                const meta = DIAGRAM_TYPE_META[diagram.diagram_type]
                const Icon = meta.icon
                return (
                  <div
                    key={diagram.id}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleOpenDiagram(diagram)}
                  >
                    <div className={`p-2 rounded-lg bg-gray-100 ${meta.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{diagram.name}</div>
                      <div className="text-xs text-gray-500">{meta.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Key KPIs */}
        {kpis.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">Key Performance Indicators</h3>
              <button onClick={onViewKPIs} className="text-sm text-primary hover:underline">
                View all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {topKpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <TrendingUp size={16} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{kpi.name}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${KPI_CATEGORY_COLORS[kpi.category] || 'bg-gray-100 text-gray-600'}`}>
                          {kpi.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{kpi.definition}</p>
                      {kpi.business_value && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {kpi.business_value}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Project Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4">Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd className="text-gray-900 capitalize">{project.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-900">
                {new Date(project.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Updated</dt>
              <dd className="text-gray-900">
                {new Date(project.updated_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* GitHub Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">GitHub</h3>
            {project.external_refs?.github && onUnlinkGitHub && (
              <button
                onClick={onUnlinkGitHub}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Unlink
              </button>
            )}
          </div>

          {project.external_refs?.github ? (
            <GitHubLink github={project.external_refs.github} size="md" />
          ) : (
            <button
              onClick={onLinkGitHub}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
            >
              <GitBranch size={16} />
              Link a repository
            </button>
          )}
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

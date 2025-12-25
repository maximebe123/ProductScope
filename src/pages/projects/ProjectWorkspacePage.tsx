/**
 * Project Workspace Page
 * Main workspace for a project with diagrams, stories, and AI chat
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Settings, FileText, Network, Lightbulb, HelpCircle, Target, Route, TrendingUp } from 'lucide-react'
import {
  projectApi,
  diagramApi,
  storyApi,
  questionApi,
  decisionApi,
  featureApi,
  kpiApi,
  userJourneyApi,
  type Project,
  type DiagramListItem,
  type Story,
  type Question,
  type Decision,
  type Feature,
  type KPI,
  type UserJourney,
  type GitHubAttachment,
} from '../../services/projectApi'
import { getDiagramRoute } from './constants'
import {
  OverviewTab,
  DiagramsTab,
  StoriesTab,
  QuestionsTab,
  DecisionsTab,
  FeaturesTab,
  KPIsTab,
  UserJourneyTab,
  NewDiagramModal,
} from './tabs'
import { GitHubAttachModal } from '../../components/GitHub'

type TabId = 'overview' | 'diagrams' | 'stories' | 'questions' | 'decisions' | 'features' | 'kpis' | 'journeys'

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [project, setProject] = useState<Project | null>(null)
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [journeys, setJourneys] = useState<UserJourney[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewDiagramModal, setShowNewDiagramModal] = useState(false)
  const [diagramMenuOpen, setDiagramMenuOpen] = useState<string | null>(null)
  const [showGitHubModal, setShowGitHubModal] = useState(false)

  // Get active tab from URL or default to 'overview'
  const tabParam = searchParams.get('tab')
  const validTabs: TabId[] = ['overview', 'diagrams', 'stories', 'questions', 'decisions', 'features', 'kpis', 'journeys']
  const activeTab: TabId = validTabs.includes(tabParam as TabId) ? (tabParam as TabId) : 'overview'

  const setActiveTab = (tab: TabId) => {
    if (tab === 'overview') {
      setSearchParams({})
    } else {
      setSearchParams({ tab })
    }
  }

  const loadProject = useCallback(async () => {
    if (!projectId) return
    try {
      setLoading(true)
      setError(null)
      const [projectData, diagramsData, storiesData, questionsData, decisionsData, featuresData, kpisData, journeysData] = await Promise.all([
        projectApi.get(projectId),
        diagramApi.list(projectId),
        storyApi.list(projectId).catch(() => []),
        questionApi.list(projectId).catch(() => []),
        decisionApi.list(projectId).catch(() => []),
        featureApi.list(projectId).catch(() => []),
        kpiApi.list(projectId).catch(() => []),
        userJourneyApi.list(projectId).catch(() => []),
      ])
      setProject(projectData)
      setDiagrams(diagramsData)
      setStories(storiesData)
      setQuestions(questionsData)
      setDecisions(decisionsData)
      setFeatures(featuresData)
      setKpis(kpisData)
      setJourneys(journeysData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  const handleDeleteDiagram = async (diagramId: string) => {
    if (!projectId || !confirm('Delete this diagram?')) return
    try {
      await diagramApi.delete(projectId, diagramId)
      setDiagrams(diagrams.filter((d) => d.id !== diagramId))
      setDiagramMenuOpen(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete diagram')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Handle GitHub attachment
  const handleGitHubAttach = useCallback((github: GitHubAttachment) => {
    if (project) {
      setProject({
        ...project,
        external_refs: { ...project.external_refs, github },
      })
    }
  }, [project])

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Invalid project ID</p>
          <button onClick={() => navigate('/projects')} className="text-primary hover:underline">
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-primary" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <button onClick={() => navigate('/projects')} className="text-primary hover:underline">
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const tabs: { id: TabId; label: string; icon: typeof Network }[] = [
    { id: 'overview', label: 'Overview', icon: Network },
    { id: 'diagrams', label: 'Diagrams', icon: Network },
    { id: 'stories', label: 'Stories', icon: FileText },
    { id: 'questions', label: 'Questions', icon: HelpCircle },
    { id: 'decisions', label: 'Decisions', icon: Lightbulb },
    { id: 'features', label: 'Features', icon: Target },
    { id: 'kpis', label: 'KPIs', icon: TrendingUp },
    { id: 'journeys', label: 'Journeys', icon: Route },
  ]

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
            )}
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <Settings size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.id === 'stories' && stories.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {stories.length}
                </span>
              )}
              {tab.id === 'questions' && questions.filter(q => q.status === 'open').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {questions.filter(q => q.status === 'open').length}
                </span>
              )}
              {tab.id === 'features' && features.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {features.length}
                </span>
              )}
              {tab.id === 'kpis' && kpis.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {kpis.length}
                </span>
              )}
              {tab.id === 'journeys' && journeys.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {journeys.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content with transition */}
      <main className="px-6 py-6">
        <div key={activeTab} className="animate-in">
          {activeTab === 'overview' && (
            <OverviewTab
              project={project}
              diagrams={diagrams}
              kpis={kpis}
              onViewDiagrams={() => setActiveTab('diagrams')}
              onViewKPIs={() => setActiveTab('kpis')}
              onLinkGitHub={() => setShowGitHubModal(true)}
              onUnlinkGitHub={async () => {
                const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
                try {
                  await fetch(`${API_BASE}/api/github/attach/${projectId}`, { method: 'DELETE' })
                  setProject({
                    ...project,
                    external_refs: { ...project.external_refs, github: undefined },
                  })
                } catch {
                  // Handle error silently
                }
              }}
            />
          )}

          {activeTab === 'diagrams' && (
            <DiagramsTab
              projectId={projectId}
              diagrams={diagrams}
              diagramMenuOpen={diagramMenuOpen}
              setDiagramMenuOpen={setDiagramMenuOpen}
              onDelete={handleDeleteDiagram}
              onCreateNew={() => setShowNewDiagramModal(true)}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'stories' && (
            <StoriesTab
              projectId={projectId}
              stories={stories}
              onUpdate={loadProject}
            />
          )}

          {activeTab === 'questions' && (
            <QuestionsTab
              projectId={projectId}
              questions={questions}
              onUpdate={loadProject}
            />
          )}

          {activeTab === 'decisions' && (
            <DecisionsTab
              projectId={projectId}
              decisions={decisions}
              onUpdate={loadProject}
            />
          )}

          {activeTab === 'features' && (
            <FeaturesTab
              projectId={projectId}
              features={features}
              onUpdate={loadProject}
              github={project.external_refs?.github}
            />
          )}

          {activeTab === 'kpis' && (
            <KPIsTab
              projectId={projectId}
              kpis={kpis}
              onUpdate={loadProject}
              github={project.external_refs?.github}
            />
          )}

          {activeTab === 'journeys' && (
            <UserJourneyTab
              projectId={projectId}
              journeys={journeys}
              onUpdate={loadProject}
            />
          )}
        </div>
      </main>

      {/* New Diagram Modal */}
      {showNewDiagramModal && (
        <NewDiagramModal
          projectId={projectId}
          onClose={() => setShowNewDiagramModal(false)}
          onCreate={(diagram) => {
            setDiagrams([diagram, ...diagrams])
            setShowNewDiagramModal(false)
            navigate(getDiagramRoute(diagram.diagram_type, projectId, diagram.id))
          }}
        />
      )}

      {/* GitHub Attach Modal */}
      <GitHubAttachModal
        isOpen={showGitHubModal}
        projectId={projectId}
        currentGitHub={project.external_refs?.github}
        onClose={() => setShowGitHubModal(false)}
        onAttach={handleGitHubAttach}
      />
    </div>
  )
}

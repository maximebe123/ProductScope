/**
 * Project Shell
 * Unified layout wrapper for project pages with header, sidebar, and AI chat
 */

import { useState, useEffect, useCallback } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { MessageSquare, X } from 'lucide-react'
import { ProjectHeader } from './ProjectHeader'
import { ProjectSidebar } from './ProjectSidebar'
import { projectApi, type Project } from '../../services/projectApi'

export function ProjectShell() {
  const { projectId } = useParams<{ projectId: string }>()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Load project data if we're on a project page
  const loadProject = useCallback(async () => {
    if (!projectId) {
      setProject(null)
      return
    }

    try {
      setLoading(true)
      const data = await projectApi.get(projectId)
      setProject(data)
    } catch (err) {
      console.error('Failed to load project:', err)
      setProject(null)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  const counts = project
    ? {
        diagrams: project.diagram_count || 0,
        stories: project.story_count || 0,
        questions: project.question_count || 0,
        decisions: project.decision_count || 0,
      }
    : undefined

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <ProjectHeader currentProject={project} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ProjectSidebar projectId={projectId} counts={counts} />

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ project, loading, reload: loadProject }} />
        </main>

        {/* AI Chat Panel (collapsible) */}
        {showChat && (
          <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" />
                <span className="font-medium text-sm text-gray-900">Assistant IA</span>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 p-4 text-center text-sm text-gray-500">
              <p>Chat IA pour les projets bientôt disponible.</p>
            </div>
          </aside>
        )}
      </div>

      {/* Floating Chat Button (when chat is hidden) */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-white rounded-full shadow-lg
                   hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center z-40"
          title="Ouvrir l'assistant IA"
        >
          <MessageSquare size={20} />
        </button>
      )}
    </div>
  )
}

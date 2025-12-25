/**
 * Project Header
 * Header component for the project shell with project selector and user menu
 */

import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, LogOut, User, FolderOpen, Check } from 'lucide-react'
import { useAuth } from '../../auth'
import { projectApi, type Project } from '../../services/projectApi'

interface ProjectHeaderProps {
  currentProject?: Project | null
  onProjectChange?: (projectId: string) => void
}

export function ProjectHeader({ currentProject, onProjectChange }: ProjectHeaderProps) {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const { user, logout } = useAuth()

  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)

  // Load projects for dropdown
  useEffect(() => {
    if (showProjectDropdown && projects.length === 0) {
      setLoadingProjects(true)
      projectApi
        .list({ page_size: 50 })
        .then((response) => {
          setProjects(response.items)
        })
        .catch(console.error)
        .finally(() => setLoadingProjects(false))
    }
  }, [showProjectDropdown, projects.length])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProjectDropdown(false)
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProjectSelect = (project: Project) => {
    setShowProjectDropdown(false)
    if (onProjectChange) {
      onProjectChange(project.id)
    } else {
      navigate(`/projects/${project.id}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left: Logo + Project Selector */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Project Selector */}
        <div className="relative" ref={projectDropdownRef}>
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FolderOpen size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
              {currentProject?.name || 'Tous les projets'}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showProjectDropdown && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
              {/* All projects link */}
              <button
                onClick={() => {
                  setShowProjectDropdown(false)
                  navigate('/projects')
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                  !projectId ? 'text-primary font-medium' : 'text-gray-700'
                }`}
              >
                <FolderOpen size={14} className="text-gray-400" />
                Tous les projets
                {!projectId && <Check size={14} className="ml-auto text-primary" />}
              </button>

              <div className="border-t border-gray-100 my-1" />

              {loadingProjects ? (
                <div className="px-3 py-4 text-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-primary mx-auto" />
                </div>
              ) : projects.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  Aucun projet
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                        projectId === project.id ? 'text-primary font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          project.status === 'active'
                            ? 'bg-emerald-400'
                            : project.status === 'draft'
                              ? 'bg-slate-300'
                              : 'bg-amber-400'
                        }`}
                      />
                      <span className="truncate">{project.name}</span>
                      {projectId === project.id && (
                        <Check size={14} className="ml-auto text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: User Menu */}
      <div className="relative" ref={userDropdownRef}>
        <button
          onClick={() => setShowUserDropdown(!showUserDropdown)}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
            <User size={14} className="text-primary" />
          </div>
          <span className="text-sm text-gray-700 hidden sm:block">{user?.name || 'Utilisateur'}</span>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
          />
        </button>

        {showUserDropdown && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-sm font-medium text-gray-900">{user?.name}</div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut size={14} className="text-gray-400" />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

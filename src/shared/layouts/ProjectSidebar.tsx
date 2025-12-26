/**
 * Project Sidebar
 * Navigation sidebar for the project shell
 */

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  FileText,
  HelpCircle,
  Lightbulb,
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: typeof LayoutDashboard
  path: string
  count?: number
}

interface ProjectSidebarProps {
  projectId?: string
  counts?: {
    diagrams?: number
    stories?: number
    questions?: number
    decisions?: number
  }
}

const SIDEBAR_COLLAPSED_KEY = 'productscope-sidebar-collapsed'

export function ProjectSidebar({ projectId, counts }: ProjectSidebarProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return stored === 'true'
  })

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  // Determine which page we're on
  const isProjectWorkspace = !!projectId

  const projectNavItems: NavItem[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, path: `/projects/${projectId}` },
    { id: 'diagrams', label: 'Diagrammes', icon: Network, path: `/projects/${projectId}?tab=diagrams`, count: counts?.diagrams },
    { id: 'stories', label: 'Stories', icon: FileText, path: `/projects/${projectId}?tab=stories`, count: counts?.stories },
    { id: 'questions', label: 'Questions', icon: HelpCircle, path: `/projects/${projectId}?tab=questions`, count: counts?.questions },
    { id: 'decisions', label: 'Décisions', icon: Lightbulb, path: `/projects/${projectId}?tab=decisions`, count: counts?.decisions },
  ]

  const listNavItems: NavItem[] = [
    { id: 'all', label: 'Tous les projets', icon: FolderOpen, path: '/projects' },
  ]

  const navItems = isProjectWorkspace ? projectNavItems : listNavItems

  // Check if a nav item is active
  const isActive = (item: NavItem) => {
    if (item.id === 'overview' && location.pathname === `/projects/${projectId}` && !location.search) {
      return true
    }
    if (item.id === 'all' && location.pathname === '/projects') {
      return true
    }
    const tabMatch = location.search.includes(`tab=${item.id}`)
    return tabMatch
  }

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative ${
                active
                  ? 'bg-primary/5 text-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r" />
              )}
              <Icon size={18} className={active ? 'text-primary' : 'text-gray-400'} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        {/* Settings (if in project) */}
        {isProjectWorkspace && (
          <Link
            to={`/projects/${projectId}/settings`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title={collapsed ? 'Paramètres' : undefined}
          >
            <Settings size={18} className="text-gray-400" />
            {!collapsed && <span className="text-sm font-medium">Paramètres</span>}
          </Link>
        )}

        {/* Back to Home */}
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          title={collapsed ? 'Accueil' : undefined}
        >
          <Home size={18} className="text-gray-400" />
          {!collapsed && <span className="text-sm font-medium">Accueil</span>}
        </Link>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors w-full"
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span className="text-sm">Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

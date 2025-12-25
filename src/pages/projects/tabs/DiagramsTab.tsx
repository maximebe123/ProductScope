/**
 * Diagrams Tab
 * Shows all diagrams in a project with grid view
 */

import { useNavigate } from 'react-router-dom'
import { Plus, MoreHorizontal, Trash2, Network, Clock } from 'lucide-react'
import type { DiagramListItem } from '../../../services/projectApi'
import { DIAGRAM_TYPE_META, getDiagramRoute } from '../constants'

export interface DiagramsTabProps {
  projectId: string
  diagrams: DiagramListItem[]
  diagramMenuOpen: string | null
  setDiagramMenuOpen: (id: string | null) => void
  onDelete: (id: string) => void
  onCreateNew: () => void
  formatDate: (date: string) => string
}

export function DiagramsTab({
  projectId,
  diagrams,
  diagramMenuOpen,
  setDiagramMenuOpen,
  onDelete,
  onCreateNew,
  formatDate,
}: DiagramsTabProps) {
  const navigate = useNavigate()

  const handleOpenDiagram = (diagram: DiagramListItem) => {
    navigate(getDiagramRoute(diagram.diagram_type, projectId, diagram.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">All Diagrams</h2>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg
                   hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Diagram
        </button>
      </div>

      {diagrams.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Network size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No diagrams yet</h3>
          <p className="text-gray-500 mb-6">Create your first diagram for this project</p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg
                     hover:bg-primary/90 transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            Create Diagram
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {diagrams.map((diagram) => {
            const meta = DIAGRAM_TYPE_META[diagram.diagram_type]
            const Icon = meta.icon
            return (
              <div
                key={diagram.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-primary/30
                         hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleOpenDiagram(diagram)}
              >
                {/* Thumbnail */}
                <div className="h-32 bg-gray-50 rounded-t-xl flex items-center justify-center border-b border-gray-100">
                  <Icon size={32} className={`${meta.color} opacity-30`} />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
                        {diagram.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-gray-400">v{diagram.version}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDiagramMenuOpen(diagramMenuOpen === diagram.id ? null : diagram.id)
                        }}
                        className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal size={16} className="text-gray-400" />
                      </button>
                      {diagramMenuOpen === diagram.id && (
                        <div
                          className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200
                                   shadow-lg py-1 min-w-[120px] z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onDelete(diagram.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                    <Clock size={12} />
                    {formatDate(diagram.updated_at)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

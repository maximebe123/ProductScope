/**
 * New Diagram Modal
 * Modal for creating a new diagram in a project
 */

import { useState } from 'react'
import { diagramApi, type DiagramListItem, type DiagramType } from '../../../services/projectApi'
import { DIAGRAM_TYPE_META } from '../constants'

export interface NewDiagramModalProps {
  projectId: string
  onClose: () => void
  onCreate: (diagram: DiagramListItem) => void
}

export function NewDiagramModal({ projectId, onClose, onCreate }: NewDiagramModalProps) {
  const [name, setName] = useState('')
  const [diagramType, setDiagramType] = useState<DiagramType>('architecture')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      setCreating(true)
      setError(null)

      const initialData: Record<DiagramType, Record<string, unknown>> = {
        architecture: { nodes: [], edges: [] },
        mindmap: { nodeData: { id: 'root', topic: name, children: [] } },
        flowchart: { code: 'graph TD\n    A[Start] --> B[End]' },
        journey: { nodes: [], edges: [] },
        storymap: { nodes: [], edges: [] },
      }

      const diagram = await diagramApi.create(projectId, {
        name: name.trim(),
        diagram_type: diagramType,
        data: initialData[diagramType],
      })

      onCreate(diagram as DiagramListItem)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create diagram')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Diagram</h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diagram Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Diagram"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagram Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(DIAGRAM_TYPE_META) as [DiagramType, typeof DIAGRAM_TYPE_META['architecture']][]).map(
                    ([type, meta]) => {
                      const Icon = meta.icon
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setDiagramType(type)}
                          className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                            diagramType === type
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon size={18} className={meta.color} />
                          <span className="text-sm font-medium text-gray-700">{meta.label}</span>
                        </button>
                      )
                    }
                  )}
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || creating}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg
                         hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Diagram'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

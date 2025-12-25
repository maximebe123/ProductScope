/**
 * Hook for loading/saving diagrams within project context
 * Uses PostgreSQL API instead of localStorage when in project mode
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Node, Edge } from 'reactflow'
import { BaseNodeData } from '../components/Nodes'
import { diagramApi, type Diagram, type DiagramType } from '../services/projectApi'

const AUTOSAVE_DEBOUNCE = 2000 // 2 seconds debounce

interface UseProjectDiagramOptions {
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
  onRestore: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void
  diagramType?: DiagramType // Reserved for future use (creating new diagrams)
}

interface UseProjectDiagramReturn {
  // Project context
  projectId: string | null
  diagramId: string | null
  isProjectMode: boolean
  diagram: Diagram | null

  // Save state
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  isSaving: boolean
  error: string | null

  // Actions
  save: () => Promise<void>
  updateDiagramName: (name: string) => Promise<void>
}

export function useProjectDiagram({
  nodes,
  edges,
  onRestore,
}: UseProjectDiagramOptions): UseProjectDiagramReturn {
  const [searchParams] = useSearchParams()

  const projectId = searchParams.get('project')
  const diagramId = searchParams.get('diagram')
  const isProjectMode = !!(projectId && diagramId)

  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousDataRef = useRef<string>('')
  const initialLoadRef = useRef(true)

  // Load diagram from API on mount (only in project mode)
  useEffect(() => {
    if (!projectId || !diagramId || !initialLoadRef.current) return
    initialLoadRef.current = false

    const loadDiagram = async () => {
      try {
        setError(null)
        const data = await diagramApi.get(projectId, diagramId)
        setDiagram(data)

        // Restore nodes and edges from diagram data
        if (data.data && typeof data.data === 'object') {
          const diagramData = data.data as { nodes?: Node<BaseNodeData>[]; edges?: Edge[] }
          if (diagramData.nodes && diagramData.edges) {
            onRestore(diagramData.nodes, diagramData.edges)
            previousDataRef.current = JSON.stringify({
              nodes: diagramData.nodes,
              edges: diagramData.edges,
            })
          }
        }

        setLastSaved(new Date(data.updated_at))
      } catch (err) {
        console.error('[useProjectDiagram] Failed to load diagram:', err)
        setError(err instanceof Error ? err.message : 'Failed to load diagram')
      }
    }

    loadDiagram()
  }, [projectId, diagramId, onRestore])

  // Auto-save with debounce (only in project mode)
  useEffect(() => {
    if (!projectId || !diagramId) return

    // Create a simplified snapshot for comparison
    const currentData = JSON.stringify({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        parentNode: n.parentNode,
        style: n.style,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data,
      })),
    })

    // Skip if data hasn't changed or is empty
    if (currentData === previousDataRef.current || nodes.length === 0) {
      return
    }

    setHasUnsavedChanges(true)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce the save
    debounceRef.current = setTimeout(async () => {
      try {
        setIsSaving(true)
        setError(null)

        await diagramApi.update(projectId, diagramId, {
          data: { nodes, edges },
        })

        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        previousDataRef.current = currentData
      } catch (err) {
        console.error('[useProjectDiagram] Failed to save diagram:', err)
        setError(err instanceof Error ? err.message : 'Failed to save diagram')
      } finally {
        setIsSaving(false)
      }
    }, AUTOSAVE_DEBOUNCE)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [nodes, edges, projectId, diagramId])

  // Manual save
  const save = useCallback(async () => {
    if (!projectId || !diagramId) return

    try {
      setIsSaving(true)
      setError(null)

      await diagramApi.update(projectId, diagramId, {
        data: { nodes, edges },
      })

      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      previousDataRef.current = JSON.stringify({ nodes, edges })
    } catch (err) {
      console.error('[useProjectDiagram] Failed to save diagram:', err)
      setError(err instanceof Error ? err.message : 'Failed to save diagram')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [projectId, diagramId, nodes, edges])

  // Update diagram name
  const updateDiagramName = useCallback(
    async (name: string) => {
      if (!projectId || !diagramId) return

      try {
        const updated = await diagramApi.update(projectId, diagramId, { name })
        setDiagram(updated)
      } catch (err) {
        console.error('[useProjectDiagram] Failed to update diagram name:', err)
        throw err
      }
    },
    [projectId, diagramId]
  )

  return {
    projectId,
    diagramId,
    isProjectMode,
    diagram,
    lastSaved,
    hasUnsavedChanges,
    isSaving,
    error,
    save,
    updateDiagramName,
  }
}

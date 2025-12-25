/**
 * Generic hook for loading/saving any diagram type within project context
 * Works with MindElixir, Mermaid, or any other data format
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diagramApi, type Diagram } from '../services/projectApi'

const AUTOSAVE_DEBOUNCE = 2000 // 2 seconds debounce

interface UseProjectDiagramGenericOptions<T> {
  data: T | null
  onRestore: (data: T) => void
  isEmpty: (data: T | null) => boolean
  serialize?: (data: T) => Record<string, unknown>
  deserialize?: (raw: Record<string, unknown>) => T
}

interface UseProjectDiagramGenericReturn {
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

export function useProjectDiagramGeneric<T>({
  data,
  onRestore,
  isEmpty,
  serialize = (d) => d as Record<string, unknown>,
  deserialize = (raw) => raw as T,
}: UseProjectDiagramGenericOptions<T>): UseProjectDiagramGenericReturn {
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
        const diagramData = await diagramApi.get(projectId, diagramId)
        setDiagram(diagramData)

        // Restore data from diagram
        if (diagramData.data && typeof diagramData.data === 'object') {
          const restored = deserialize(diagramData.data)
          onRestore(restored)
          previousDataRef.current = JSON.stringify(diagramData.data)
        }

        setLastSaved(new Date(diagramData.updated_at))
      } catch (err) {
        console.error('[useProjectDiagramGeneric] Failed to load diagram:', err)
        setError(err instanceof Error ? err.message : 'Failed to load diagram')
      }
    }

    loadDiagram()
  }, [projectId, diagramId, onRestore, deserialize])

  // Auto-save with debounce (only in project mode)
  useEffect(() => {
    if (!projectId || !diagramId || isEmpty(data) || data === null) return

    const serialized = serialize(data)
    const currentData = JSON.stringify(serialized)

    // Skip if data hasn't changed
    if (currentData === previousDataRef.current) {
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
          data: serialized,
        })

        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        previousDataRef.current = currentData
      } catch (err) {
        console.error('[useProjectDiagramGeneric] Failed to save diagram:', err)
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
  }, [data, projectId, diagramId, isEmpty, serialize])

  // Manual save
  const save = useCallback(async () => {
    if (!projectId || !diagramId || isEmpty(data) || data === null) return

    try {
      setIsSaving(true)
      setError(null)

      const serialized = serialize(data)
      await diagramApi.update(projectId, diagramId, {
        data: serialized,
      })

      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      previousDataRef.current = JSON.stringify(serialized)
    } catch (err) {
      console.error('[useProjectDiagramGeneric] Failed to save diagram:', err)
      setError(err instanceof Error ? err.message : 'Failed to save diagram')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [projectId, diagramId, data, isEmpty, serialize])

  // Update diagram name
  const updateDiagramName = useCallback(
    async (name: string) => {
      if (!projectId || !diagramId) return

      try {
        const updated = await diagramApi.update(projectId, diagramId, { name })
        setDiagram(updated)
      } catch (err) {
        console.error('[useProjectDiagramGeneric] Failed to update diagram name:', err)
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

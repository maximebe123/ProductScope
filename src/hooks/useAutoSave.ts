import { useEffect, useRef, useState, useCallback } from 'react'
import { Node, Edge } from 'reactflow'
import { BaseNodeData } from '../components/Nodes'
import { storageService } from '../shared/storage'
import { migrateNodeType, isValidNodeType } from '../modules/diagrams/config/nodeConfig'

// Legacy key for migration
const LEGACY_STORAGE_KEY = 'productscope-autosave'

// New storage key (within module namespace)
const STORAGE_KEY = 'autosave'
const DEFAULT_MODULE_ID = 'diagrams'

const AUTOSAVE_DEBOUNCE = 2000 // 2 seconds debounce after changes

interface AutoSaveData {
  version: string
  savedAt: string
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
}

interface UseAutoSaveOptions {
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
  onRestore: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void
  enabled?: boolean
  moduleId?: string // Allow different modules to have separate auto-saves
}

interface UseAutoSaveReturn {
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  clearAutoSave: () => void
  hasSavedData: boolean
}

export function useAutoSave({
  nodes,
  edges,
  onRestore,
  enabled = true,
  moduleId = DEFAULT_MODULE_ID,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [hasSavedData, setHasSavedData] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadRef = useRef(true)
  const previousDataRef = useRef<string>('')
  const migrationAttemptedRef = useRef(false)

  // Migrate from legacy storage on first load
  useEffect(() => {
    if (migrationAttemptedRef.current) return
    migrationAttemptedRef.current = true

    // Attempt migration from legacy key
    const migrated = storageService.migrateFromLegacy(
      LEGACY_STORAGE_KEY,
      moduleId,
      STORAGE_KEY
    )

    if (migrated) {
      console.warn('[useAutoSave] Migrated data from legacy storage format')
    }
  }, [moduleId])

  // Check if there's saved data on mount
  useEffect(() => {
    const saved = storageService.load<AutoSaveData>(moduleId, STORAGE_KEY)
    setHasSavedData(!!saved)
  }, [moduleId])

  // Restore from storage on mount (with node type migration)
  useEffect(() => {
    if (!enabled || !initialLoadRef.current) return
    initialLoadRef.current = false

    try {
      const data = storageService.load<AutoSaveData>(moduleId, STORAGE_KEY)
      if (data && data.nodes && data.edges && data.nodes.length > 0) {
        // Migrate legacy node types to new Solution Architecture types
        const migratedNodes = data.nodes.map((node) => {
          const nodeType = node.data?.nodeType
          if (nodeType && !isValidNodeType(nodeType)) {
            const newNodeType = migrateNodeType(nodeType, node.data?.tags)
            console.warn(`[useAutoSave] Migrating node type: ${nodeType} -> ${newNodeType}`)
            return {
              ...node,
              data: {
                ...node.data,
                nodeType: newNodeType,
              },
            }
          }
          return node
        })

        onRestore(migratedNodes, data.edges)
        setLastSaved(new Date(data.savedAt))
        previousDataRef.current = JSON.stringify({ nodes: migratedNodes, edges: data.edges })
      }
    } catch (error) {
      console.error('[useAutoSave] Failed to restore auto-saved data:', error)
    }
  }, [enabled, onRestore, moduleId])

  // Save to storage with debounce
  useEffect(() => {
    if (!enabled) return

    // Create a simplified snapshot for comparison
    const currentData = JSON.stringify({
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        parentNode: n.parentNode,
        style: n.style,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data,
      })),
    })

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
    debounceRef.current = setTimeout(() => {
      try {
        const saveData: AutoSaveData = {
          version: '1.0',
          savedAt: new Date().toISOString(),
          nodes,
          edges,
        }
        storageService.save(moduleId, STORAGE_KEY, saveData)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        setHasSavedData(true)
        previousDataRef.current = currentData
      } catch (error) {
        console.error('[useAutoSave] Failed to auto-save:', error)
      }
    }, AUTOSAVE_DEBOUNCE)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [nodes, edges, enabled, moduleId])

  const clearAutoSave = useCallback(() => {
    storageService.remove(moduleId, STORAGE_KEY)
    setLastSaved(null)
    setHasUnsavedChanges(false)
    setHasSavedData(false)
    previousDataRef.current = ''
  }, [moduleId])

  return {
    lastSaved,
    hasUnsavedChanges,
    clearAutoSave,
    hasSavedData,
  }
}

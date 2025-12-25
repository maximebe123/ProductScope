/**
 * Generic Auto-Save Hook for all modules
 * Provides consistent auto-save behavior across diagrams, mindmap, and flowchart
 */

import { useEffect, useRef, useState, useCallback } from 'react'

const AUTOSAVE_DEBOUNCE = 1000 // 1 second debounce

interface UseModuleAutoSaveOptions<T> {
  /** Storage key for localStorage */
  storageKey: string
  /** Current data to save */
  data: T
  /** Called when data is restored from storage */
  onRestore: (data: T) => void
  /** Optional: Transform data before saving */
  serialize?: (data: T) => string
  /** Optional: Transform data after loading */
  deserialize?: (raw: string) => T
  /** Optional: Check if data is empty/should not be saved */
  isEmpty?: (data: T) => boolean
  /** Enable/disable auto-save */
  enabled?: boolean
}

interface UseModuleAutoSaveReturn {
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  clearAutoSave: () => void
}

/**
 * Generic auto-save hook that works with any data type
 */
export function useModuleAutoSave<T>({
  storageKey,
  data,
  onRestore,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
  isEmpty = () => false,
  enabled = true,
}: UseModuleAutoSaveOptions<T>): UseModuleAutoSaveReturn {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadRef = useRef(true)
  const previousDataRef = useRef<string>('')

  // Restore from storage on mount
  useEffect(() => {
    if (!enabled || !initialLoadRef.current) return
    initialLoadRef.current = false

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = deserialize(saved)
        if (parsed && !isEmpty(parsed)) {
          onRestore(parsed)
          previousDataRef.current = saved
        }
      }
    } catch (error) {
      console.error(`[useModuleAutoSave] Failed to restore from ${storageKey}:`, error)
    }
  }, [enabled, storageKey, onRestore, deserialize, isEmpty])

  // Save to storage with debounce
  useEffect(() => {
    if (!enabled || isEmpty(data)) return

    const currentData = serialize(data)

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
        localStorage.setItem(storageKey, currentData)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        previousDataRef.current = currentData
      } catch (error) {
        console.error(`[useModuleAutoSave] Failed to save to ${storageKey}:`, error)
      }
    }, AUTOSAVE_DEBOUNCE)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [data, enabled, storageKey, serialize, isEmpty])

  const clearAutoSave = useCallback(() => {
    localStorage.removeItem(storageKey)
    setLastSaved(null)
    setHasUnsavedChanges(false)
    previousDataRef.current = ''
  }, [storageKey])

  return {
    lastSaved,
    hasUnsavedChanges,
    clearAutoSave,
  }
}

/**
 * Simple string auto-save (for Mermaid code)
 */
export function useStringAutoSave(
  storageKey: string,
  data: string,
  onRestore: (data: string) => void,
  enabled = true
) {
  return useModuleAutoSave({
    storageKey,
    data,
    onRestore,
    serialize: (s) => s,
    deserialize: (s) => s,
    isEmpty: (s) => !s || s.trim() === '',
    enabled,
  })
}

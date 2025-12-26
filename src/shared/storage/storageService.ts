/**
 * Unified Storage Service
 * Provides namespaced localStorage access for all modules
 *
 * Key format: productscope:{moduleId}:{key}
 * Example: productscope:diagrams:autosave
 */

const STORAGE_PREFIX = 'productscope'

/**
 * Storage Service Interface
 */
export interface StorageService {
  save<T>(moduleId: string, key: string, data: T): void
  load<T>(moduleId: string, key: string): T | null
  remove(moduleId: string, key: string): void
  listKeys(moduleId: string): string[]
  clear(moduleId: string): void
  clearAll(): void
  migrateFromLegacy(legacyKey: string, moduleId: string, newKey: string): boolean
}

/**
 * Build a namespaced storage key
 */
function buildKey(moduleId: string, key: string): string {
  return `${STORAGE_PREFIX}:${moduleId}:${key}`
}

/**
 * Create the storage service
 */
function createStorageService(): StorageService {
  return {
    /**
     * Save data to storage
     */
    save<T>(moduleId: string, key: string, data: T): void {
      try {
        const storageKey = buildKey(moduleId, key)
        const serialized = JSON.stringify(data)
        localStorage.setItem(storageKey, serialized)
      } catch (error) {
        console.error(`[StorageService] Failed to save ${moduleId}:${key}`, error)
      }
    },

    /**
     * Load data from storage
     */
    load<T>(moduleId: string, key: string): T | null {
      try {
        const storageKey = buildKey(moduleId, key)
        const serialized = localStorage.getItem(storageKey)
        if (serialized === null) return null
        return JSON.parse(serialized) as T
      } catch (error) {
        console.error(`[StorageService] Failed to load ${moduleId}:${key}`, error)
        return null
      }
    },

    /**
     * Remove data from storage
     */
    remove(moduleId: string, key: string): void {
      try {
        const storageKey = buildKey(moduleId, key)
        localStorage.removeItem(storageKey)
      } catch (error) {
        console.error(`[StorageService] Failed to remove ${moduleId}:${key}`, error)
      }
    },

    /**
     * List all keys for a module
     */
    listKeys(moduleId: string): string[] {
      const prefix = `${STORAGE_PREFIX}:${moduleId}:`
      const keys: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i)
        if (fullKey && fullKey.startsWith(prefix)) {
          keys.push(fullKey.slice(prefix.length))
        }
      }

      return keys
    },

    /**
     * Clear all data for a module
     */
    clear(moduleId: string): void {
      const keys = this.listKeys(moduleId)
      keys.forEach((key) => this.remove(moduleId, key))
    },

    /**
     * Clear all ProductScope data
     */
    clearAll(): void {
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i)
        if (fullKey && fullKey.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(fullKey)
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key))
    },

    /**
     * Migrate data from legacy (non-namespaced) key to new format
     * Returns true if migration occurred, false otherwise
     */
    migrateFromLegacy(legacyKey: string, moduleId: string, newKey: string): boolean {
      try {
        const legacyData = localStorage.getItem(legacyKey)
        if (legacyData === null) return false

        // Save to new location
        const newStorageKey = buildKey(moduleId, newKey)
        localStorage.setItem(newStorageKey, legacyData)

        // Remove legacy key
        localStorage.removeItem(legacyKey)

        console.warn(`[StorageService] Migrated ${legacyKey} → ${newStorageKey}`)
        return true
      } catch (error) {
        console.error(`[StorageService] Migration failed for ${legacyKey}`, error)
        return false
      }
    },
  }
}

// Export singleton instance
export const storageService = createStorageService()

// Export helper for checking if storage is available
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

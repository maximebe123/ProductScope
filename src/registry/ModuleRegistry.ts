import type { ModuleDefinition, ModuleRegistrationOptions } from '../core/types/module'

/**
 * Module Registry - Manages registration and access to application modules
 *
 * This singleton registry allows modules to be registered at startup
 * and accessed throughout the application.
 */
class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map()
  private defaultModuleId: string | null = null

  /**
   * Register a module with the registry
   */
  register(module: ModuleDefinition, options: ModuleRegistrationOptions = {}): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module "${module.id}" is already registered. Overwriting.`)
    }

    this.modules.set(module.id, module)

    if (options.isDefault || this.defaultModuleId === null) {
      this.defaultModuleId = module.id
    }
  }

  /**
   * Unregister a module from the registry
   */
  unregister(moduleId: string): boolean {
    const deleted = this.modules.delete(moduleId)

    if (deleted && this.defaultModuleId === moduleId) {
      // Set new default to first available module
      const firstModule = this.modules.keys().next().value
      this.defaultModuleId = firstModule || null
    }

    return deleted
  }

  /**
   * Get a module by ID
   */
  getModule(id: string): ModuleDefinition | undefined {
    return this.modules.get(id)
  }

  /**
   * Get all registered modules
   */
  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get module IDs
   */
  getModuleIds(): string[] {
    return Array.from(this.modules.keys())
  }

  /**
   * Check if a module is registered
   */
  hasModule(id: string): boolean {
    return this.modules.has(id)
  }

  /**
   * Get the default module
   */
  getDefaultModule(): ModuleDefinition | undefined {
    return this.defaultModuleId ? this.modules.get(this.defaultModuleId) : undefined
  }

  /**
   * Get the default module ID
   */
  getDefaultModuleId(): string | null {
    return this.defaultModuleId
  }

  /**
   * Set the default module
   */
  setDefaultModule(moduleId: string): void {
    if (!this.modules.has(moduleId)) {
      throw new Error(`Cannot set default: Module "${moduleId}" is not registered`)
    }
    this.defaultModuleId = moduleId
  }

  /**
   * Get module count
   */
  get count(): number {
    return this.modules.size
  }

  /**
   * Clear all modules (useful for testing)
   */
  clear(): void {
    this.modules.clear()
    this.defaultModuleId = null
  }
}

// Export singleton instance
export const moduleRegistry = new ModuleRegistry()

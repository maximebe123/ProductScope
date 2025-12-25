/**
 * Module Context
 * Provides module state and navigation throughout the app
 */

import {
  createContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { ModuleDefinition, ModuleContextValue } from '../types/module'
import { moduleRegistry } from '../../registry/modules'

export const ModuleContext = createContext<ModuleContextValue | null>(null)

interface ModuleProviderProps {
  children: ReactNode
}

/**
 * Module Provider - Manages active module state
 */
export function ModuleProvider({ children }: ModuleProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // Get available modules from registry
  const availableModules = moduleRegistry.getAllModules()

  // Determine active module from current route
  const getModuleFromPath = useCallback((): ModuleDefinition => {
    const path = location.pathname

    // Find module matching current path
    const matchedModule = availableModules.find((module) =>
      path.startsWith(module.route)
    )

    // Return matched module or default
    if (matchedModule) {
      return matchedModule
    }
    const defaultModule = moduleRegistry.getDefaultModule()
    if (!defaultModule) {
      throw new Error('No module found and no default module registered')
    }
    return defaultModule
  }, [location.pathname, availableModules])

  const [activeModule, setActiveModule] = useState<ModuleDefinition>(getModuleFromPath)

  // Update active module when route changes
  useEffect(() => {
    const newModule = getModuleFromPath()
    if (newModule && newModule.id !== activeModule.id) {
      setActiveModule(newModule)
    }
  }, [location.pathname, getModuleFromPath, activeModule.id])

  // Switch to a different module
  const switchModule = useCallback(
    (moduleId: string) => {
      const module = moduleRegistry.getModule(moduleId)
      if (!module) {
        console.error(`Module "${moduleId}" not found in registry`)
        return
      }

      setActiveModule(module)
      navigate(module.route)
    },
    [navigate]
  )

  const value: ModuleContextValue = {
    activeModule,
    switchModule,
    availableModules,
  }

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  )
}

// Re-export hooks from dedicated files for backwards compatibility
export { useModuleContext, useActiveModule, useModuleSwitch } from './hooks'

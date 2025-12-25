import type { ModuleDefinition } from '../../types/module'
import { useModuleContext } from './useModuleContext'

/**
 * Hook to get the active module
 */
export function useActiveModule(): ModuleDefinition {
  const { activeModule } = useModuleContext()
  return activeModule
}

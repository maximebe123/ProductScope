import { useModuleContext } from './useModuleContext'

/**
 * Hook to switch modules
 */
export function useModuleSwitch(): (moduleId: string) => void {
  const { switchModule } = useModuleContext()
  return switchModule
}

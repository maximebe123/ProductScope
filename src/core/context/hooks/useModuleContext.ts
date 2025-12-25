import { useContext } from 'react'
import { ModuleContext } from '../ModuleContext'
import type { ModuleContextValue } from '../../types/module'

/**
 * Hook to access module context
 * @throws Error if used outside of ModuleProvider
 */
export function useModuleContext(): ModuleContextValue {
  const context = useContext(ModuleContext)
  if (!context) {
    throw new Error('useModuleContext must be used within a ModuleProvider')
  }
  return context
}

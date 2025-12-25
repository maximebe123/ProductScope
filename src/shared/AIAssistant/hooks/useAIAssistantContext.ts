import { useContext } from 'react'
import { AIAssistantContext, type AIAssistantContextValue } from '../AIAssistantProvider'

/**
 * Hook to access AI Assistant context
 * @throws Error if used outside of AIAssistantProvider
 */
export function useAIAssistantContext(): AIAssistantContextValue {
  const context = useContext(AIAssistantContext)
  if (!context) {
    throw new Error(
      'useAIAssistantContext must be used within AIAssistantProvider'
    )
  }
  return context
}

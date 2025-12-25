/**
 * Hook for managing feature discovery from GitHub
 */

import { useState, useCallback, useRef } from 'react'
import {
  featureApi,
  type FeatureDiscoveryRequest,
  type FeatureDiscoveryEvent,
  type CandidateFeature,
  type Feature,
} from '../services/projectApi'

interface AgentLog {
  agent: string
  description: string
  status: 'running' | 'complete'
  reasoning: string
  summary?: string
  count?: number
}

interface DiscoveryState {
  phase: 'idle' | 'running' | 'reviewing' | 'saving' | 'complete' | 'error'
  progress: number
  agentLogs: AgentLog[]
  candidates: CandidateFeature[]
  error: string | null
}

interface UseFeatureDiscoveryResult {
  state: DiscoveryState
  startDiscovery: (projectId: string, options: FeatureDiscoveryRequest) => Promise<void>
  cancelDiscovery: () => void
  toggleFeatureSelection: (tempId: string) => void
  selectAll: () => void
  deselectAll: () => void
  saveSelectedFeatures: (projectId: string) => Promise<Feature[]>
  reset: () => void
}

const initialState: DiscoveryState = {
  phase: 'idle',
  progress: 0,
  agentLogs: [],
  candidates: [],
  error: null,
}

export function useFeatureDiscovery(): UseFeatureDiscoveryResult {
  const [state, setState] = useState<DiscoveryState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startDiscovery = useCallback(async (
    projectId: string,
    options: FeatureDiscoveryRequest
  ) => {
    // Reset state
    setState({
      phase: 'running',
      progress: 0,
      agentLogs: [],
      candidates: [],
      error: null,
    })

    // Create abort controller
    abortControllerRef.current = new AbortController()

    try {
      for await (const event of featureApi.discoverFromGitHub(
        projectId,
        options,
        abortControllerRef.current.signal
      )) {
        handleEvent(event)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({ ...prev, phase: 'idle', error: 'Discovery cancelled' }))
      } else {
        setState(prev => ({
          ...prev,
          phase: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
      }
    }
  }, [])

  const handleEvent = useCallback((event: FeatureDiscoveryEvent) => {
    switch (event.type) {
      case 'agent_start':
        setState(prev => ({
          ...prev,
          agentLogs: [
            ...prev.agentLogs,
            {
              agent: event.agent || 'unknown',
              description: event.description || '',
              status: 'running',
              reasoning: '',
            },
          ],
        }))
        break

      case 'reasoning':
        setState(prev => ({
          ...prev,
          agentLogs: prev.agentLogs.map((log, i) =>
            i === prev.agentLogs.length - 1
              ? { ...log, reasoning: log.reasoning + (event.token || '') }
              : log
          ),
        }))
        break

      case 'agent_complete':
        setState(prev => ({
          ...prev,
          progress: event.progress || prev.progress,
          agentLogs: prev.agentLogs.map((log, i) =>
            i === prev.agentLogs.length - 1
              ? {
                  ...log,
                  status: 'complete' as const,
                  summary: event.summary,
                  count: event.count,
                }
              : log
          ),
        }))
        break

      case 'feature_preview':
        // Could be used for real-time preview, but we'll wait for complete
        break

      case 'complete': {
        // Select all features by default
        const candidatesWithSelection = (event.features || []).map(f => ({
          ...f,
          selected: true,
        }))
        setState(prev => ({
          ...prev,
          phase: 'reviewing',
          progress: 100,
          candidates: candidatesWithSelection,
        }))
        break
      }

      case 'error':
        setState(prev => ({
          ...prev,
          phase: 'error',
          error: event.message || 'Unknown error',
        }))
        break
    }
  }, [])

  const cancelDiscovery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const toggleFeatureSelection = useCallback((tempId: string) => {
    setState(prev => ({
      ...prev,
      candidates: prev.candidates.map(c =>
        c.temp_id === tempId ? { ...c, selected: !c.selected } : c
      ),
    }))
  }, [])

  const selectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      candidates: prev.candidates.map(c => ({ ...c, selected: true })),
    }))
  }, [])

  const deselectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      candidates: prev.candidates.map(c => ({ ...c, selected: false })),
    }))
  }, [])

  const saveSelectedFeatures = useCallback(async (projectId: string): Promise<Feature[]> => {
    const selectedFeatures = state.candidates.filter(c => c.selected)

    if (selectedFeatures.length === 0) {
      return []
    }

    setState(prev => ({ ...prev, phase: 'saving' }))

    try {
      const result = await featureApi.batchCreate(projectId, selectedFeatures)
      setState(prev => ({ ...prev, phase: 'complete' }))
      return result.created
    } catch (error) {
      setState(prev => ({
        ...prev,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Failed to save features',
      }))
      throw error
    }
  }, [state.candidates])

  const reset = useCallback(() => {
    cancelDiscovery()
    setState(initialState)
  }, [cancelDiscovery])

  return {
    state,
    startDiscovery,
    cancelDiscovery,
    toggleFeatureSelection,
    selectAll,
    deselectAll,
    saveSelectedFeatures,
    reset,
  }
}

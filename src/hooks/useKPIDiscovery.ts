/**
 * Hook for managing KPI discovery from GitHub
 * Discovers business KPIs from code to valorize the application
 */

import { useState, useCallback, useRef } from 'react'
import {
  kpiApi,
  type KPIDiscoveryRequest,
  type KPIDiscoveryEvent,
  type CandidateKPI,
  type KPI,
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
  candidates: CandidateKPI[]
  error: string | null
}

interface UseKPIDiscoveryResult {
  state: DiscoveryState
  startDiscovery: (projectId: string, options: KPIDiscoveryRequest) => Promise<void>
  cancelDiscovery: () => void
  toggleKPISelection: (tempId: string) => void
  selectAll: () => void
  deselectAll: () => void
  saveSelectedKPIs: (projectId: string) => Promise<KPI[]>
  reset: () => void
}

const initialState: DiscoveryState = {
  phase: 'idle',
  progress: 0,
  agentLogs: [],
  candidates: [],
  error: null,
}

export function useKPIDiscovery(): UseKPIDiscoveryResult {
  const [state, setState] = useState<DiscoveryState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startDiscovery = useCallback(async (
    projectId: string,
    options: KPIDiscoveryRequest
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
      for await (const event of kpiApi.discoverFromGitHub(
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

  const handleEvent = useCallback((event: KPIDiscoveryEvent) => {
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

      case 'kpi_preview':
        // Could be used for real-time preview, but we'll wait for complete
        break

      case 'complete': {
        // Select all KPIs by default
        const candidatesWithSelection = (event.kpis || []).map(k => ({
          ...k,
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

  const toggleKPISelection = useCallback((tempId: string) => {
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

  const saveSelectedKPIs = useCallback(async (projectId: string): Promise<KPI[]> => {
    const selectedKPIs = state.candidates.filter(c => c.selected)

    if (selectedKPIs.length === 0) {
      return []
    }

    setState(prev => ({ ...prev, phase: 'saving' }))

    try {
      const result = await kpiApi.batchCreate(projectId, selectedKPIs)
      setState(prev => ({ ...prev, phase: 'complete' }))
      return result.created
    } catch (error) {
      setState(prev => ({
        ...prev,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Failed to save KPIs',
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
    toggleKPISelection,
    selectAll,
    deselectAll,
    saveSelectedKPIs,
    reset,
  }
}

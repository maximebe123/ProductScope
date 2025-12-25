/**
 * KPI API
 * CRUD operations for KPIs and discovery from GitHub
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type {
  KPI,
  KPICreate,
  KPIUpdate,
  KPIDiscoveryRequest,
  KPIDiscoveryEvent,
  CandidateKPI,
} from './types'

export const kpiApi = {
  async list(projectId: string): Promise<KPI[]> {
    return fetchWithErrorHandling<KPI[]>(
      `${API_BASE_URL}/api/projects/${projectId}/kpis`
    )
  },

  async get(projectId: string, kpiId: string): Promise<KPI> {
    return fetchWithErrorHandling<KPI>(
      `${API_BASE_URL}/api/projects/${projectId}/kpis/${kpiId}`
    )
  },

  async create(projectId: string, data: KPICreate): Promise<KPI> {
    return fetchWithErrorHandling<KPI>(
      `${API_BASE_URL}/api/projects/${projectId}/kpis`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  },

  async update(projectId: string, kpiId: string, data: KPIUpdate): Promise<KPI> {
    return fetchWithErrorHandling<KPI>(
      `${API_BASE_URL}/api/projects/${projectId}/kpis/${kpiId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  },

  async delete(projectId: string, kpiId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/kpis/${kpiId}`,
      { method: 'DELETE' }
    )
  },

  /**
   * Discover KPIs from GitHub repository using AI agents.
   * Returns an async iterator of SSE events.
   */
  async *discoverFromGitHub(
    projectId: string,
    options: KPIDiscoveryRequest,
    signal?: AbortSignal
  ): AsyncGenerator<KPIDiscoveryEvent> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/kpis/discover-from-github`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
        signal,
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6)) as KPIDiscoveryEvent
            yield event
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  },

  /**
   * Batch create KPIs from discovery results.
   */
  async batchCreate(
    projectId: string,
    kpis: CandidateKPI[]
  ): Promise<{ created: KPI[]; count: number }> {
    return fetchWithErrorHandling<{ created: KPI[]; count: number }>(
      `${API_BASE_URL}/api/projects/${projectId}/kpis/batch`,
      { method: 'POST', body: JSON.stringify({ kpis }) }
    )
  },
}

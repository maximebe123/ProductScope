/**
 * Feature API
 * CRUD operations for features
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type {
  Feature,
  FeatureCreate,
  FeatureUpdate,
  FeatureGenerateRequest,
  FeatureDiscoveryRequest,
  FeatureDiscoveryEvent,
  FeatureExtractionRequest,
  FeatureExtractionEvent,
  CandidateFeature,
} from './types'

export const featureApi = {
  async list(projectId: string): Promise<Feature[]> {
    return fetchWithErrorHandling<Feature[]>(
      `${API_BASE_URL}/api/projects/${projectId}/features`
    )
  },

  async get(projectId: string, featureId: string): Promise<Feature> {
    return fetchWithErrorHandling<Feature>(
      `${API_BASE_URL}/api/projects/${projectId}/features/${featureId}`
    )
  },

  async create(projectId: string, data: FeatureCreate): Promise<Feature> {
    return fetchWithErrorHandling<Feature>(
      `${API_BASE_URL}/api/projects/${projectId}/features`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  },

  async update(projectId: string, featureId: string, data: FeatureUpdate): Promise<Feature> {
    return fetchWithErrorHandling<Feature>(
      `${API_BASE_URL}/api/projects/${projectId}/features/${featureId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  },

  async delete(projectId: string, featureId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/features/${featureId}`,
      { method: 'DELETE' }
    )
  },

  async generate(projectId: string, data: FeatureGenerateRequest): Promise<{ feature: Feature }> {
    return fetchWithErrorHandling<{ feature: Feature }>(
      `${API_BASE_URL}/api/projects/${projectId}/features/generate`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  },

  /**
   * Discover features from GitHub repository using AI agents.
   * Returns an async iterator of SSE events.
   */
  async *discoverFromGitHub(
    projectId: string,
    options: FeatureDiscoveryRequest,
    signal?: AbortSignal
  ): AsyncGenerator<FeatureDiscoveryEvent> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/features/discover-from-github`,
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
            const event = JSON.parse(line.slice(6)) as FeatureDiscoveryEvent
            yield event
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  },

  /**
   * Extract EXISTING features from GitHub repository using AI agents.
   * Returns an async iterator of SSE events.
   */
  async *extractFromGitHub(
    projectId: string,
    options: FeatureExtractionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<FeatureExtractionEvent> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/features/extract-from-github`,
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
            const event = JSON.parse(line.slice(6)) as FeatureExtractionEvent
            yield event
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  },

  /**
   * Batch create features from discovery results.
   */
  async batchCreate(
    projectId: string,
    features: CandidateFeature[]
  ): Promise<{ created: Feature[]; count: number }> {
    return fetchWithErrorHandling<{ created: Feature[]; count: number }>(
      `${API_BASE_URL}/api/projects/${projectId}/features/batch`,
      { method: 'POST', body: JSON.stringify({ features }) }
    )
  },
}

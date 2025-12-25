/**
 * Decision API
 * CRUD operations for project decisions
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type { Decision, DecisionCreate, DecisionUpdate } from './types'

export const decisionApi = {
  async list(projectId: string): Promise<Decision[]> {
    return fetchWithErrorHandling<Decision[]>(
      `${API_BASE_URL}/api/projects/${projectId}/decisions`
    )
  },

  async get(projectId: string, decisionId: string): Promise<Decision> {
    return fetchWithErrorHandling<Decision>(
      `${API_BASE_URL}/api/projects/${projectId}/decisions/${decisionId}`
    )
  },

  async create(projectId: string, data: DecisionCreate): Promise<Decision> {
    return fetchWithErrorHandling<Decision>(
      `${API_BASE_URL}/api/projects/${projectId}/decisions`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  },

  async update(projectId: string, decisionId: string, data: DecisionUpdate): Promise<Decision> {
    return fetchWithErrorHandling<Decision>(
      `${API_BASE_URL}/api/projects/${projectId}/decisions/${decisionId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  },

  async approve(projectId: string, decisionId: string, decidedBy?: string): Promise<Decision> {
    return fetchWithErrorHandling<Decision>(
      `${API_BASE_URL}/api/projects/${projectId}/decisions/${decisionId}/approve`,
      { method: 'POST', body: JSON.stringify({ decided_by: decidedBy }) }
    )
  },

  async delete(projectId: string, decisionId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/decisions/${decisionId}`,
      { method: 'DELETE' }
    )
  },
}

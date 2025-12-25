/**
 * User Journey API
 * CRUD operations for user journeys
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type { UserJourney, UserJourneyCreate, UserJourneyUpdate, UserJourneyGenerateRequest } from './types'

export const userJourneyApi = {
  async list(projectId: string): Promise<UserJourney[]> {
    return fetchWithErrorHandling<UserJourney[]>(
      `${API_BASE_URL}/api/projects/${projectId}/journeys`
    )
  },

  async get(projectId: string, journeyId: string): Promise<UserJourney> {
    return fetchWithErrorHandling<UserJourney>(
      `${API_BASE_URL}/api/projects/${projectId}/journeys/${journeyId}`
    )
  },

  async create(projectId: string, data: UserJourneyCreate): Promise<UserJourney> {
    return fetchWithErrorHandling<UserJourney>(
      `${API_BASE_URL}/api/projects/${projectId}/journeys`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  },

  async update(projectId: string, journeyId: string, data: UserJourneyUpdate): Promise<UserJourney> {
    return fetchWithErrorHandling<UserJourney>(
      `${API_BASE_URL}/api/projects/${projectId}/journeys/${journeyId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  },

  async delete(projectId: string, journeyId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/journeys/${journeyId}`,
      { method: 'DELETE' }
    )
  },

  async generate(projectId: string, data: UserJourneyGenerateRequest): Promise<{ journey: UserJourney }> {
    return fetchWithErrorHandling<{ journey: UserJourney }>(
      `${API_BASE_URL}/api/projects/${projectId}/journeys/generate`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  },
}

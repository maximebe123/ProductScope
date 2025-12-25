/**
 * Story API
 * CRUD operations for user stories
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type { Story, StoryCreate, StoryUpdate } from './types'

export const storyApi = {
  async list(projectId: string): Promise<Story[]> {
    return fetchWithErrorHandling<Story[]>(
      `${API_BASE_URL}/api/projects/${projectId}/stories`
    )
  },

  async get(projectId: string, storyId: string): Promise<Story> {
    return fetchWithErrorHandling<Story>(
      `${API_BASE_URL}/api/projects/${projectId}/stories/${storyId}`
    )
  },

  async create(projectId: string, data: StoryCreate): Promise<Story> {
    return fetchWithErrorHandling<Story>(
      `${API_BASE_URL}/api/projects/${projectId}/stories`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  },

  async update(projectId: string, storyId: string, data: StoryUpdate): Promise<Story> {
    return fetchWithErrorHandling<Story>(
      `${API_BASE_URL}/api/projects/${projectId}/stories/${storyId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  },

  async delete(projectId: string, storyId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/stories/${storyId}`,
      { method: 'DELETE' }
    )
  },
}

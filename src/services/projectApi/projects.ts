/**
 * Project API
 * CRUD operations for projects
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type { Project, ProjectCreate, ProjectUpdate, ProjectStatus, PaginatedResponse } from './types'

export const projectApi = {
  /**
   * List all projects with pagination
   */
  async list(params?: {
    page?: number
    page_size?: number
    status?: ProjectStatus
    search?: string
  }): Promise<PaginatedResponse<Project>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    const url = `${API_BASE_URL}/api/projects${query ? `?${query}` : ''}`

    return fetchWithErrorHandling<PaginatedResponse<Project>>(url)
  },

  /**
   * Get a single project by ID
   */
  async get(id: string): Promise<Project> {
    return fetchWithErrorHandling<Project>(`${API_BASE_URL}/api/projects/${id}`)
  },

  /**
   * Create a new project
   */
  async create(data: ProjectCreate): Promise<Project> {
    return fetchWithErrorHandling<Project>(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update an existing project
   */
  async update(id: string, data: ProjectUpdate): Promise<Project> {
    return fetchWithErrorHandling<Project>(`${API_BASE_URL}/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete a project
   */
  async delete(id: string): Promise<void> {
    return fetchWithErrorHandling<void>(`${API_BASE_URL}/api/projects/${id}`, {
      method: 'DELETE',
    })
  },
}

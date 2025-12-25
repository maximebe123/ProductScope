/**
 * Diagram API
 * CRUD operations for diagrams within projects
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type { Diagram, DiagramListItem, DiagramCreate, DiagramUpdate, DiagramType } from './types'

export const diagramApi = {
  /**
   * List all diagrams in a project
   */
  async list(projectId: string, params?: {
    diagram_type?: DiagramType
  }): Promise<DiagramListItem[]> {
    const searchParams = new URLSearchParams()
    if (params?.diagram_type) searchParams.set('diagram_type', params.diagram_type)

    const query = searchParams.toString()
    const url = `${API_BASE_URL}/api/projects/${projectId}/diagrams${query ? `?${query}` : ''}`

    return fetchWithErrorHandling<DiagramListItem[]>(url)
  },

  /**
   * Get a single diagram
   */
  async get(projectId: string, diagramId: string): Promise<Diagram> {
    return fetchWithErrorHandling<Diagram>(
      `${API_BASE_URL}/api/projects/${projectId}/diagrams/${diagramId}`
    )
  },

  /**
   * Create a new diagram in a project
   */
  async create(projectId: string, data: DiagramCreate): Promise<Diagram> {
    return fetchWithErrorHandling<Diagram>(
      `${API_BASE_URL}/api/projects/${projectId}/diagrams`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Update an existing diagram
   */
  async update(projectId: string, diagramId: string, data: DiagramUpdate): Promise<Diagram> {
    return fetchWithErrorHandling<Diagram>(
      `${API_BASE_URL}/api/projects/${projectId}/diagrams/${diagramId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Delete a diagram
   */
  async delete(projectId: string, diagramId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/diagrams/${diagramId}`,
      {
        method: 'DELETE',
      }
    )
  },
}

/**
 * Chat API
 * Chat history operations for projects and diagrams
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type { ChatMessage, ChatMessageCreate, ChatHistoryResponse } from './types'

export const chatApi = {
  /**
   * Get chat history for a project
   */
  async getProjectHistory(projectId: string, params?: {
    skip?: number
    limit?: number
  }): Promise<ChatHistoryResponse> {
    const searchParams = new URLSearchParams()
    if (params?.skip) searchParams.set('skip', params.skip.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const query = searchParams.toString()
    const url = `${API_BASE_URL}/api/projects/${projectId}/chat${query ? `?${query}` : ''}`

    return fetchWithErrorHandling<ChatHistoryResponse>(url)
  },

  /**
   * Add a message to project chat
   */
  async addProjectMessage(projectId: string, message: ChatMessageCreate): Promise<ChatMessage> {
    return fetchWithErrorHandling<ChatMessage>(
      `${API_BASE_URL}/api/projects/${projectId}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          message_type: message.message_type || 'text',
          status: message.status || 'complete',
          extra_data: message.extra_data || {},
        }),
      }
    )
  },

  /**
   * Clear project chat history
   */
  async clearProjectHistory(projectId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/chat`,
      { method: 'DELETE' }
    )
  },

  /**
   * Get chat history for a diagram
   */
  async getDiagramHistory(projectId: string, diagramId: string, params?: {
    skip?: number
    limit?: number
  }): Promise<ChatHistoryResponse> {
    const searchParams = new URLSearchParams()
    if (params?.skip) searchParams.set('skip', params.skip.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const query = searchParams.toString()
    const url = `${API_BASE_URL}/api/projects/${projectId}/diagrams/${diagramId}/chat${query ? `?${query}` : ''}`

    return fetchWithErrorHandling<ChatHistoryResponse>(url)
  },

  /**
   * Add a message to diagram chat
   */
  async addDiagramMessage(
    projectId: string,
    diagramId: string,
    message: ChatMessageCreate
  ): Promise<ChatMessage> {
    return fetchWithErrorHandling<ChatMessage>(
      `${API_BASE_URL}/api/projects/${projectId}/diagrams/${diagramId}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          message_type: message.message_type || 'text',
          status: message.status || 'complete',
          extra_data: message.extra_data || {},
        }),
      }
    )
  },

  /**
   * Clear diagram chat history
   */
  async clearDiagramHistory(projectId: string, diagramId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/diagrams/${diagramId}/chat`,
      { method: 'DELETE' }
    )
  },
}

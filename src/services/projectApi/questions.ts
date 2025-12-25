/**
 * Question API
 * CRUD operations for project questions
 */

import { API_BASE_URL, fetchWithErrorHandling } from './base'
import type { Question, QuestionCreate, QuestionUpdate } from './types'

export const questionApi = {
  async list(projectId: string): Promise<Question[]> {
    return fetchWithErrorHandling<Question[]>(
      `${API_BASE_URL}/api/projects/${projectId}/questions`
    )
  },

  async get(projectId: string, questionId: string): Promise<Question> {
    return fetchWithErrorHandling<Question>(
      `${API_BASE_URL}/api/projects/${projectId}/questions/${questionId}`
    )
  },

  async create(projectId: string, data: QuestionCreate): Promise<Question> {
    return fetchWithErrorHandling<Question>(
      `${API_BASE_URL}/api/projects/${projectId}/questions`,
      { method: 'POST', body: JSON.stringify(data) }
    )
  },

  async update(projectId: string, questionId: string, data: QuestionUpdate): Promise<Question> {
    return fetchWithErrorHandling<Question>(
      `${API_BASE_URL}/api/projects/${projectId}/questions/${questionId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    )
  },

  async answer(projectId: string, questionId: string, answer: string, answeredBy?: string): Promise<Question> {
    return fetchWithErrorHandling<Question>(
      `${API_BASE_URL}/api/projects/${projectId}/questions/${questionId}/answer`,
      { method: 'POST', body: JSON.stringify({ answer, answered_by: answeredBy }) }
    )
  },

  async delete(projectId: string, questionId: string): Promise<void> {
    return fetchWithErrorHandling<void>(
      `${API_BASE_URL}/api/projects/${projectId}/questions/${questionId}`,
      { method: 'DELETE' }
    )
  },
}

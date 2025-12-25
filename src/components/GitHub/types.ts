/**
 * Shared GitHub types
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface GitHubUser {
  username: string
  avatar_url?: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description?: string
  html_url: string
  private: boolean
  language?: string
  stargazers_count: number
  updated_at: string
}

export interface ValidatedRepo {
  name: string
  description?: string
  isPrivate: boolean
}

/**
 * Format relative time from ISO date string
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

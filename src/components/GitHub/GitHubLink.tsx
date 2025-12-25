/**
 * GitHubLink Component
 * Displays a compact link to a GitHub repository with optional unlink action
 */

import { Github, ExternalLink, X } from 'lucide-react'
import type { GitHubAttachment } from '../../services/projectApi/types'

export interface GitHubLinkProps {
  github: GitHubAttachment | null | undefined
  size?: 'sm' | 'md'
  showUnlink?: boolean
  onUnlink?: () => void
  className?: string
}

export default function GitHubLink({
  github,
  size = 'md',
  showUnlink = false,
  onUnlink,
  className = '',
}: GitHubLinkProps) {
  if (!github) return null

  const sizeClasses = {
    sm: {
      container: 'text-xs gap-1.5 px-2 py-1',
      icon: 14,
      text: 'max-w-[120px]',
    },
    md: {
      container: 'text-sm gap-2 px-3 py-1.5',
      icon: 16,
      text: 'max-w-[200px]',
    },
  }

  const styles = sizeClasses[size]

  return (
    <div
      className={`inline-flex items-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ${styles.container} ${className}`}
    >
      <Github size={styles.icon} className="text-gray-600 flex-shrink-0" />

      <a
        href={github.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1 text-gray-700 hover:text-gray-900 truncate ${styles.text}`}
        title={`${github.owner}/${github.repo_name}`}
      >
        <span className="truncate">
          {github.owner}/{github.repo_name}
        </span>
        <ExternalLink size={styles.icon - 2} className="flex-shrink-0 opacity-50" />
      </a>

      {github.is_private && (
        <span className="px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded font-medium">
          Private
        </span>
      )}

      {showUnlink && onUnlink && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onUnlink()
          }}
          className="p-0.5 hover:bg-gray-300 rounded transition-colors ml-1"
          title="Unlink repository"
        >
          <X size={styles.icon - 2} className="text-gray-500 hover:text-red-500" />
        </button>
      )}
    </div>
  )
}

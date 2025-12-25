/**
 * ValidatedRepoPreview Component
 * Shows validated repository information with optional actions
 */

import { Lock, ExternalLink, Github } from 'lucide-react'
import { ValidatedRepo } from '../types'

interface ValidatedRepoPreviewProps {
  repo: ValidatedRepo
  repoUrl: string
  onClear?: () => void
  variant?: 'success' | 'info'
}

export default function ValidatedRepoPreview({
  repo,
  repoUrl,
  onClear,
  variant = 'success',
}: ValidatedRepoPreviewProps) {
  const bgColor = variant === 'success' ? 'bg-green-50' : 'bg-green-50 border border-green-200'
  const textColor = variant === 'success' ? 'text-green-800' : 'text-green-800'
  const subTextColor = variant === 'success' ? 'text-green-600' : 'text-green-700'

  return (
    <div className={`p-3 rounded-lg ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${textColor} flex items-center gap-1`}>
            {variant === 'info' && <Github size={16} className="text-green-700" />}
            {repo.name}
            {repo.isPrivate && (
              variant === 'info' ? (
                <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded ml-1">
                  Private
                </span>
              ) : (
                <Lock size={12} />
              )
            )}
          </p>
          {repo.description && (
            <p className={`text-xs ${subTextColor} mt-0.5 truncate`}>
              {repo.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onClear && (
            <button
              onClick={onClear}
              className={`p-1.5 hover:bg-green-100 rounded ${subTextColor} text-xs`}
            >
              Change
            </button>
          )}
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-1.5 hover:bg-green-100 rounded inline-flex items-center gap-1 ${variant === 'info' ? 'text-xs' : ''}`}
          >
            <ExternalLink size={14} className={subTextColor} />
            {variant === 'info' && <span className={subTextColor}>View on GitHub</span>}
          </a>
        </div>
      </div>
    </div>
  )
}

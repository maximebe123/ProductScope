/**
 * RepoSelector Component
 * Shared component for selecting GitHub repositories
 */

import { Search, Star, Lock, ChevronRight, Loader2 } from 'lucide-react'
import { GitHubRepo, formatRelativeTime } from '../types'

interface RepoSelectorProps {
  repos: GitHubRepo[]
  isLoading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectRepo: (repo: GitHubRepo) => void
  selectedUrl?: string
  onManualInput: () => void
  maxHeight?: string
}

export default function RepoSelector({
  repos,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectRepo,
  selectedUrl,
  onManualInput,
  maxHeight = 'max-h-64',
}: RepoSelectorProps) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search your repositories..."
          className="
            w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            text-sm
          "
        />
      </div>

      {/* Repo List */}
      <div className={`border border-gray-200 rounded-lg ${maxHeight} overflow-y-auto`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="ml-2 text-sm">Loading repositories...</span>
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {searchQuery ? 'No repositories found' : 'No repositories available'}
          </div>
        ) : (
          repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelectRepo(repo)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5
                hover:bg-gray-50 transition-colors text-left
                border-b border-gray-100 last:border-b-0
                ${selectedUrl === repo.html_url ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {repo.name}
                  </span>
                  {repo.private && (
                    <Lock size={12} className="text-gray-400 flex-shrink-0" />
                  )}
                </div>
                {repo.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {repo.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {repo.language}
                    </span>
                  )}
                  {repo.stargazers_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={10} />
                      {repo.stargazers_count}
                    </span>
                  )}
                  <span>{formatRelativeTime(repo.updated_at)}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Manual input toggle */}
      <button
        onClick={onManualInput}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Or enter a repository URL manually
      </button>
    </div>
  )
}

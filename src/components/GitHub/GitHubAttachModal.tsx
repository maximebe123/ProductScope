/**
 * GitHubAttachModal Component
 * Modal for attaching a GitHub repository to an existing project
 * Supports OAuth authentication and repository picker (simpler than import modal)
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Github, X, Lock, ExternalLink, AlertCircle, User, LogOut,
  Search, Star, ChevronRight, Loader2, Link2
} from 'lucide-react'
import type { GitHubAttachment } from '../../services/projectApi/types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface GitHubAttachModalProps {
  isOpen: boolean
  projectId: string
  currentGitHub?: GitHubAttachment | null
  onClose: () => void
  onAttach: (github: GitHubAttachment) => void
}

interface GitHubUser {
  username: string
  avatar_url?: string
}

interface GitHubRepo {
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

export default function GitHubAttachModal({
  isOpen,
  projectId,
  currentGitHub,
  onClose,
  onAttach,
}: GitHubAttachModalProps) {
  // Form state
  const [repoUrl, setRepoUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validatedRepo, setValidatedRepo] = useState<{
    name: string
    description?: string
    isPrivate: boolean
  } | null>(null)
  const [isAttaching, setIsAttaching] = useState(false)

  // OAuth state
  const [oauthConfigured, setOauthConfigured] = useState(false)
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Repo picker state
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  // Check OAuth status and stored token on mount
  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/github/oauth/status`)
        const data = await response.json()
        setOauthConfigured(data.configured)
      } catch {
        // OAuth not configured
      }
    }

    const checkStoredToken = () => {
      const token = sessionStorage.getItem('github_token')
      const username = sessionStorage.getItem('github_username')
      const avatar = sessionStorage.getItem('github_avatar')

      if (token && username) {
        setGithubUser({
          username,
          avatar_url: avatar || undefined,
        })
      }
    }

    if (isOpen) {
      checkOAuthStatus()
      checkStoredToken()
    }
  }, [isOpen])

  // Load repos when user is connected
  useEffect(() => {
    const loadRepos = async () => {
      const token = sessionStorage.getItem('github_token')
      if (!token || !githubUser) return

      setIsLoadingRepos(true)
      try {
        const response = await fetch(
          `${API_BASE}/api/github/repos?token=${encodeURIComponent(token)}&per_page=50`
        )
        const data = await response.json()
        setRepos(data.repos || [])
      } catch {
        // Failed to load repos
      } finally {
        setIsLoadingRepos(false)
      }
    }

    if (githubUser && isOpen) {
      loadRepos()
    }
  }, [githubUser, isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRepoUrl('')
      setIsValidating(false)
      setValidationError(null)
      setValidatedRepo(null)
      setIsAttaching(false)
      setSearchQuery('')
      setShowManualInput(false)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAttaching) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isAttaching, onClose])

  // Start OAuth flow
  const startOAuth = useCallback(async () => {
    setIsConnecting(true)
    try {
      const response = await fetch(`${API_BASE}/api/github/oauth/authorize`)
      const data = await response.json()

      if (data.authorization_url) {
        sessionStorage.setItem('github_oauth_state', data.state)
        window.location.href = data.authorization_url
      }
    } catch {
      setValidationError('Failed to start GitHub authentication')
      setIsConnecting(false)
    }
  }, [])

  // Disconnect from GitHub
  const disconnectGitHub = useCallback(() => {
    sessionStorage.removeItem('github_token')
    sessionStorage.removeItem('github_username')
    sessionStorage.removeItem('github_avatar')
    setGithubUser(null)
    setRepos([])
  }, [])

  // Get stored token
  const getToken = useCallback(() => {
    return sessionStorage.getItem('github_token') || undefined
  }, [])

  // Select a repo from the list
  const selectRepo = useCallback((repo: GitHubRepo) => {
    setRepoUrl(repo.html_url)
    setValidatedRepo({
      name: repo.name,
      description: repo.description,
      isPrivate: repo.private,
    })
    setValidationError(null)
  }, [])

  // Validate repository URL (for manual input)
  const validateRepo = useCallback(async () => {
    if (!repoUrl.trim()) {
      setValidationError('Please enter a repository URL')
      return
    }

    setIsValidating(true)
    setValidationError(null)
    setValidatedRepo(null)

    try {
      const response = await fetch(`${API_BASE}/api/github/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl.trim(),
          auth_token: getToken(),
        }),
      })

      const data = await response.json()

      if (data.valid) {
        setValidatedRepo({
          name: data.repo_name,
          description: data.description,
          isPrivate: data.is_private,
        })
      } else {
        setValidationError(data.error || 'Invalid repository')
      }
    } catch {
      setValidationError('Failed to validate repository')
    } finally {
      setIsValidating(false)
    }
  }, [repoUrl, getToken])

  // Attach repository to project
  const attachRepo = useCallback(async () => {
    if (!validatedRepo || !repoUrl) return

    setIsAttaching(true)
    setValidationError(null)

    try {
      const response = await fetch(`${API_BASE}/api/github/attach/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl.trim(),
          auth_token: getToken(),
          fetch_metadata: true,
        }),
      })

      const data = await response.json()

      if (data.success && data.github) {
        onAttach(data.github)
        onClose()
      } else {
        setValidationError(data.error || 'Failed to attach repository')
      }
    } catch {
      setValidationError('Failed to attach repository')
    } finally {
      setIsAttaching(false)
    }
  }, [repoUrl, validatedRepo, projectId, getToken, onAttach, onClose])

  // Filter repos by search query
  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isAttaching && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Github size={20} className="text-gray-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Link GitHub Repository</h2>
              <p className="text-sm text-gray-500">Connect a repository to this project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAttaching}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current GitHub (if linked) */}
          {currentGitHub && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">Currently linked to:</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                {currentGitHub.owner}/{currentGitHub.repo_name}
              </p>
              <p className="mt-1 text-xs text-yellow-600">
                Linking a new repository will replace the current one.
              </p>
            </div>
          )}

          {/* OAuth Section */}
          {oauthConfigured && (
            <div className="space-y-4">
              {githubUser ? (
                <>
                  {/* Connected user */}
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {githubUser.avatar_url ? (
                        <img
                          src={githubUser.avatar_url}
                          alt={githubUser.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                          <User size={16} className="text-green-700" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Connected as @{githubUser.username}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={disconnectGitHub}
                      className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                    >
                      <LogOut size={14} />
                      Disconnect
                    </button>
                  </div>

                  {/* Repo picker or manual input toggle */}
                  {!showManualInput ? (
                    <>
                      {/* Search */}
                      <div className="relative">
                        <Search
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Search your repositories..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>

                      {/* Repo list */}
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {isLoadingRepos ? (
                          <div className="p-8 text-center">
                            <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">Loading repositories...</p>
                          </div>
                        ) : filteredRepos.length === 0 ? (
                          <div className="p-8 text-center text-sm text-gray-500">
                            {searchQuery ? 'No repositories match your search' : 'No repositories found'}
                          </div>
                        ) : (
                          filteredRepos.map((repo) => (
                            <button
                              key={repo.id}
                              onClick={() => selectRepo(repo)}
                              className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                                repoUrl === repo.html_url ? 'bg-primary/5 border-l-2 border-primary' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-medium text-gray-900 truncate">
                                    {repo.name}
                                  </span>
                                  {repo.private && (
                                    <Lock size={12} className="text-yellow-600 flex-shrink-0" />
                                  )}
                                </div>
                                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                              </div>
                              {repo.description && (
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {repo.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                {repo.language && <span>{repo.language}</span>}
                                {repo.stargazers_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Star size={10} />
                                    {repo.stargazers_count}
                                  </span>
                                )}
                                <span>{formatRelativeTime(repo.updated_at)}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      {/* Manual input link */}
                      <button
                        onClick={() => setShowManualInput(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        Or enter a repository URL manually
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Manual URL input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repository URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://github.com/owner/repo"
                            value={repoUrl}
                            onChange={(e) => {
                              setRepoUrl(e.target.value)
                              setValidatedRepo(null)
                              setValidationError(null)
                            }}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <button
                            onClick={validateRepo}
                            disabled={isValidating || !repoUrl.trim()}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isValidating ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              'Validate'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Back to picker */}
                      <button
                        onClick={() => {
                          setShowManualInput(false)
                          setRepoUrl('')
                          setValidatedRepo(null)
                          setValidationError(null)
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        Back to repository picker
                      </button>
                    </>
                  )}
                </>
              ) : (
                /* Connect button */
                <button
                  onClick={startOAuth}
                  disabled={isConnecting}
                  className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Github size={18} />
                  )}
                  Connect with GitHub
                </button>
              )}
            </div>
          )}

          {/* Manual input only (if OAuth not configured) */}
          {!oauthConfigured && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value)
                    setValidatedRepo(null)
                    setValidationError(null)
                  }}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  onClick={validateRepo}
                  disabled={isValidating || !repoUrl.trim()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {isValidating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Validate'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}

          {/* Validated repo preview */}
          {validatedRepo && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Github size={16} className="text-green-700" />
                <span className="font-medium text-green-800">{validatedRepo.name}</span>
                {validatedRepo.isPrivate && (
                  <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                    Private
                  </span>
                )}
              </div>
              {validatedRepo.description && (
                <p className="mt-1 text-sm text-green-700">{validatedRepo.description}</p>
              )}
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 hover:underline"
              >
                View on GitHub <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isAttaching}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={attachRepo}
            disabled={!validatedRepo || isAttaching}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {isAttaching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            Link Repository
          </button>
        </div>
      </div>
    </div>
  )
}

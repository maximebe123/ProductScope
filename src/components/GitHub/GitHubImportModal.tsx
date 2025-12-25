/**
 * GitHub Import Modal
 * Modal for importing a GitHub repository and generating diagrams
 * Supports OAuth authentication and repository picker
 */

import { useState, useCallback, useEffect, memo } from 'react'
import {
  GitBranch, X, Lock, ExternalLink, AlertCircle, User, LogOut,
  Search, Star, Clock, ChevronRight, Loader2
} from 'lucide-react'
import ImportProgress, { ImportProgressData } from './ImportProgress'

interface GitHubImportModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (projectId: string) => void
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

function GitHubImportModal({ isOpen, onClose, onComplete }: GitHubImportModalProps) {
  // Form state
  const [repoUrl, setRepoUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validatedRepo, setValidatedRepo] = useState<{
    name: string
    description?: string
    isPrivate: boolean
  } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgressData | null>(null)
  const [agentLogs, setAgentLogs] = useState<ImportProgressData[]>([])

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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRepoUrl('')
      setIsValidating(false)
      setValidationError(null)
      setValidatedRepo(null)
      setIsImporting(false)
      setProgress(null)
      setAgentLogs([])
      setSearchQuery('')
      setShowManualInput(false)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isImporting) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isImporting, onClose])

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
          repo_url: repoUrl,
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
        setValidationError(data.error || 'Repository not found')
      }
    } catch {
      setValidationError('Failed to validate repository. Check your connection.')
    } finally {
      setIsValidating(false)
    }
  }, [repoUrl, getToken])

  // Start import process
  const startImport = useCallback(async () => {
    if (!validatedRepo) return

    setIsImporting(true)
    setAgentLogs([])
    setProgress({
      stage: 'fetching',
      message: 'Starting import...',
      progress: 0,
    })

    try {
      const response = await fetch(`${API_BASE}/api/github/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl,
          auth_token: getToken(),
          create_project: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start import')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as ImportProgressData

              // Accumulate agent logs
              if (eventData.stage === 'agent') {
                setAgentLogs(prev => [...prev, eventData])
              }

              setProgress(eventData)

              if (eventData.stage === 'complete' && eventData.details?.project_id) {
                const projectIdToNavigate = eventData.details.project_id
                setTimeout(() => {
                  onComplete(projectIdToNavigate)
                }, 1500)
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setProgress({
        stage: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
        progress: 0,
        details: { error: String(error) },
      })
    }
  }, [repoUrl, getToken, validatedRepo, onComplete])

  // Filter repos based on search
  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={!isImporting ? onClose : undefined}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl animate-fade-in max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <GitBranch size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Import GitHub Repository
              </h2>
              <p className="text-xs text-gray-500">
                Generate diagrams from code
              </p>
            </div>
          </div>
          {!isImporting && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {!isImporting ? (
            <div className="space-y-4">
              {/* GitHub Connection Status */}
              {oauthConfigured && (
                <div className={`
                  p-3 rounded-lg flex items-center justify-between
                  ${githubUser ? 'bg-green-50' : 'bg-gray-50'}
                `}>
                  {githubUser ? (
                    <>
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
                            {githubUser.username}
                          </p>
                          <p className="text-xs text-green-600">Connected to GitHub</p>
                        </div>
                      </div>
                      <button
                        onClick={disconnectGitHub}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                        title="Disconnect"
                      >
                        <LogOut size={16} className="text-green-600" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Lock size={16} />
                        <span className="text-sm">Connect to access private repos</span>
                      </div>
                      <button
                        onClick={startOAuth}
                        disabled={isConnecting}
                        className="
                          px-3 py-1.5 rounded-lg text-sm font-medium
                          bg-gray-900 text-white hover:bg-gray-800
                          disabled:opacity-50 transition-colors
                          flex items-center gap-2
                        "
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <GitBranch size={14} />
                            Connect GitHub
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Repo Picker (when connected) */}
              {githubUser && !validatedRepo && !showManualInput && (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search your repositories..."
                      className="
                        w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        text-sm
                      "
                    />
                  </div>

                  {/* Repo List */}
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {isLoadingRepos ? (
                      <div className="flex items-center justify-center py-8 text-gray-400">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="ml-2 text-sm">Loading repositories...</span>
                      </div>
                    ) : filteredRepos.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {searchQuery ? 'No repositories found' : 'No repositories available'}
                      </div>
                    ) : (
                      filteredRepos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => selectRepo(repo)}
                          className="
                            w-full flex items-center gap-3 px-3 py-2.5
                            hover:bg-gray-50 transition-colors text-left
                            border-b border-gray-100 last:border-b-0
                          "
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
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatRelativeTime(repo.updated_at)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                        </button>
                      ))
                    )}
                  </div>

                  {/* Manual input toggle */}
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Or enter a repository URL manually →
                  </button>
                </div>
              )}

              {/* Manual URL Input */}
              {(!githubUser || showManualInput) && !validatedRepo && (
                <div className="space-y-3">
                  {showManualInput && githubUser && (
                    <button
                      onClick={() => setShowManualInput(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      ← Back to repository list
                    </button>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Repository URL
                    </label>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => {
                        setRepoUrl(e.target.value)
                        setValidatedRepo(null)
                        setValidationError(null)
                      }}
                      placeholder="https://github.com/owner/repo"
                      className="
                        w-full px-3 py-2 rounded-lg border border-gray-200
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        text-sm
                      "
                      disabled={isValidating}
                    />
                  </div>
                </div>
              )}

              {/* Validation Error */}
              {validationError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">{validationError}</p>
                </div>
              )}

              {/* Validated Repo Info */}
              {validatedRepo && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 flex items-center gap-1">
                        {validatedRepo.name}
                        {validatedRepo.isPrivate && <Lock size={12} />}
                      </p>
                      {validatedRepo.description && (
                        <p className="text-xs text-green-600 mt-0.5 truncate">
                          {validatedRepo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setValidatedRepo(null)
                          setRepoUrl('')
                        }}
                        className="p-1.5 hover:bg-green-100 rounded text-green-600 text-xs"
                      >
                        Change
                      </button>
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-green-100 rounded"
                      >
                        <ExternalLink size={14} className="text-green-600" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : progress ? (
            <ImportProgress progress={progress} agentLogs={agentLogs} />
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          {!isImporting ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              {!validatedRepo && showManualInput ? (
                <button
                  onClick={validateRepo}
                  disabled={isValidating || !repoUrl.trim()}
                  className="
                    px-4 py-2 rounded-lg text-sm font-medium
                    bg-gray-900 text-white hover:bg-gray-800
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors flex items-center gap-2
                  "
                >
                  {isValidating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate'
                  )}
                </button>
              ) : validatedRepo ? (
                <button
                  onClick={startImport}
                  className="
                    px-4 py-2 rounded-lg text-sm font-medium
                    bg-primary text-white hover:bg-primary/90
                    transition-colors flex items-center gap-2
                  "
                >
                  <GitBranch size={16} />
                  Import Repository
                </button>
              ) : null}
            </>
          ) : progress?.stage === 'complete' ? (
            <button
              onClick={() => onComplete(progress.details?.project_id || '')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              View Project
            </button>
          ) : progress?.stage === 'error' ? (
            <button
              onClick={() => {
                setIsImporting(false)
                setProgress(null)
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default memo(GitHubImportModal)

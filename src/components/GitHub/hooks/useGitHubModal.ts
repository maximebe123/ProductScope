/**
 * Shared hook for GitHub modal logic
 * Consolidates OAuth, repo fetching, and validation logic
 */

import { useState, useCallback, useEffect } from 'react'
import { API_BASE, GitHubUser, GitHubRepo, ValidatedRepo } from '../types'

interface UseGitHubModalOptions {
  isOpen: boolean
  onClose: () => void
}

export function useGitHubModal({ isOpen, onClose }: UseGitHubModalOptions) {
  // Form state
  const [repoUrl, setRepoUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validatedRepo, setValidatedRepo] = useState<ValidatedRepo | null>(null)

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
  const resetState = useCallback(() => {
    setRepoUrl('')
    setIsValidating(false)
    setValidationError(null)
    setValidatedRepo(null)
    setSearchQuery('')
    setShowManualInput(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen, resetState])

  // Get stored token
  const getToken = useCallback(() => {
    return sessionStorage.getItem('github_token') || undefined
  }, [])

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

  // Update repo URL (clears validation)
  const updateRepoUrl = useCallback((url: string) => {
    setRepoUrl(url)
    setValidatedRepo(null)
    setValidationError(null)
  }, [])

  // Clear validated repo
  const clearValidatedRepo = useCallback(() => {
    setValidatedRepo(null)
    setRepoUrl('')
  }, [])

  // Validate repository URL
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
        setValidationError(data.error || 'Repository not found')
      }
    } catch {
      setValidationError('Failed to validate repository. Check your connection.')
    } finally {
      setIsValidating(false)
    }
  }, [repoUrl, getToken])

  // Filter repos based on search
  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle escape key
  const useEscapeKey = (isProcessing: boolean) => {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isProcessing) {
          onClose()
        }
      }

      if (isOpen) {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
      }
    }, [isProcessing])
  }

  return {
    // Form state
    repoUrl,
    updateRepoUrl,
    isValidating,
    validationError,
    setValidationError,
    validatedRepo,
    clearValidatedRepo,

    // OAuth state
    oauthConfigured,
    githubUser,
    isConnecting,
    startOAuth,
    disconnectGitHub,

    // Repo picker state
    repos: filteredRepos,
    isLoadingRepos,
    searchQuery,
    setSearchQuery,
    showManualInput,
    setShowManualInput,

    // Actions
    getToken,
    selectRepo,
    validateRepo,
    resetState,
    useEscapeKey,
  }
}

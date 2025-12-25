/**
 * GitHubAttachModal Component
 * Modal for attaching a GitHub repository to an existing project
 */

import { useState, useCallback, useEffect } from 'react'
import { Github, X, AlertCircle, Loader2, Link2 } from 'lucide-react'
import type { GitHubAttachment } from '../../services/projectApi/types'
import { useGitHubModal } from './hooks/useGitHubModal'
import { API_BASE } from './types'
import RepoSelector from './components/RepoSelector'
import GitHubConnection from './components/GitHubConnection'
import ValidatedRepoPreview from './components/ValidatedRepoPreview'

interface GitHubAttachModalProps {
  isOpen: boolean
  projectId: string
  currentGitHub?: GitHubAttachment | null
  onClose: () => void
  onAttach: (github: GitHubAttachment) => void
}

export default function GitHubAttachModal({
  isOpen,
  projectId,
  currentGitHub,
  onClose,
  onAttach,
}: GitHubAttachModalProps) {
  const modal = useGitHubModal({ isOpen, onClose })

  // Attach-specific state
  const [isAttaching, setIsAttaching] = useState(false)

  // Reset attach state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAttaching(false)
    }
  }, [isOpen])

  // Handle escape key
  modal.useEscapeKey(isAttaching)

  // Attach repository to project
  const attachRepo = useCallback(async () => {
    if (!modal.validatedRepo || !modal.repoUrl) return

    setIsAttaching(true)
    modal.setValidationError(null)

    try {
      const response = await fetch(`${API_BASE}/api/github/attach/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: modal.repoUrl.trim(),
          auth_token: modal.getToken(),
          fetch_metadata: true,
        }),
      })

      const data = await response.json()

      if (data.success && data.github) {
        onAttach(data.github)
        onClose()
      } else {
        modal.setValidationError(data.error || 'Failed to attach repository')
      }
    } catch {
      modal.setValidationError('Failed to attach repository')
    } finally {
      setIsAttaching(false)
    }
  }, [modal.repoUrl, modal.validatedRepo, projectId, modal.getToken, onAttach, onClose, modal.setValidationError])

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
          {modal.oauthConfigured && (
            <div className="space-y-4">
              {modal.githubUser ? (
                <>
                  {/* Connected user */}
                  <GitHubConnection
                    githubUser={modal.githubUser}
                    isConnecting={modal.isConnecting}
                    onConnect={modal.startOAuth}
                    onDisconnect={modal.disconnectGitHub}
                    variant="full"
                  />

                  {/* Repo picker or manual input */}
                  {!modal.showManualInput && !modal.validatedRepo && (
                    <RepoSelector
                      repos={modal.repos}
                      isLoading={modal.isLoadingRepos}
                      searchQuery={modal.searchQuery}
                      onSearchChange={modal.setSearchQuery}
                      onSelectRepo={modal.selectRepo}
                      selectedUrl={modal.repoUrl}
                      onManualInput={() => modal.setShowManualInput(true)}
                      maxHeight="max-h-48"
                    />
                  )}

                  {/* Manual input */}
                  {modal.showManualInput && !modal.validatedRepo && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Repository URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://github.com/owner/repo"
                            value={modal.repoUrl}
                            onChange={(e) => modal.updateRepoUrl(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <button
                            onClick={modal.validateRepo}
                            disabled={modal.isValidating || !modal.repoUrl.trim()}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                          >
                            {modal.isValidating ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              'Validate'
                            )}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          modal.setShowManualInput(false)
                          modal.clearValidatedRepo()
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        Back to repository picker
                      </button>
                    </>
                  )}
                </>
              ) : (
                <GitHubConnection
                  githubUser={modal.githubUser}
                  isConnecting={modal.isConnecting}
                  onConnect={modal.startOAuth}
                  onDisconnect={modal.disconnectGitHub}
                  variant="full"
                />
              )}
            </div>
          )}

          {/* Manual input only (if OAuth not configured) */}
          {!modal.oauthConfigured && !modal.validatedRepo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={modal.repoUrl}
                  onChange={(e) => modal.updateRepoUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  onClick={modal.validateRepo}
                  disabled={modal.isValidating || !modal.repoUrl.trim()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {modal.isValidating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Validate'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Validation error */}
          {modal.validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{modal.validationError}</p>
            </div>
          )}

          {/* Validated repo preview */}
          {modal.validatedRepo && (
            <ValidatedRepoPreview
              repo={modal.validatedRepo}
              repoUrl={modal.repoUrl}
              variant="info"
            />
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
            disabled={!modal.validatedRepo || isAttaching}
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

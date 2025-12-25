/**
 * GitHub Import Modal
 * Modal for importing a GitHub repository and generating diagrams
 */

import { useState, useCallback, useEffect, memo } from 'react'
import { GitBranch, X, AlertCircle, Loader2 } from 'lucide-react'
import ImportProgress, { ImportProgressData } from './ImportProgress'
import { useGitHubModal } from './hooks/useGitHubModal'
import { API_BASE } from './types'
import RepoSelector from './components/RepoSelector'
import GitHubConnection from './components/GitHubConnection'
import ValidatedRepoPreview from './components/ValidatedRepoPreview'

interface GitHubImportModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (projectId: string) => void
}

function GitHubImportModal({ isOpen, onClose, onComplete }: GitHubImportModalProps) {
  const modal = useGitHubModal({ isOpen, onClose })

  // Import-specific state
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgressData | null>(null)
  const [agentLogs, setAgentLogs] = useState<ImportProgressData[]>([])

  // Reset import state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsImporting(false)
      setProgress(null)
      setAgentLogs([])
    }
  }, [isOpen])

  // Handle escape key
  modal.useEscapeKey(isImporting)

  // Start import process
  const startImport = useCallback(async () => {
    if (!modal.validatedRepo) return

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
          repo_url: modal.repoUrl,
          auth_token: modal.getToken(),
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
  }, [modal.repoUrl, modal.getToken, modal.validatedRepo, onComplete])

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
              {modal.oauthConfigured && (
                <GitHubConnection
                  githubUser={modal.githubUser}
                  isConnecting={modal.isConnecting}
                  onConnect={modal.startOAuth}
                  onDisconnect={modal.disconnectGitHub}
                />
              )}

              {/* Repo Picker (when connected) */}
              {modal.githubUser && !modal.validatedRepo && !modal.showManualInput && (
                <RepoSelector
                  repos={modal.repos}
                  isLoading={modal.isLoadingRepos}
                  searchQuery={modal.searchQuery}
                  onSearchChange={modal.setSearchQuery}
                  onSelectRepo={modal.selectRepo}
                  selectedUrl={modal.repoUrl}
                  onManualInput={() => modal.setShowManualInput(true)}
                />
              )}

              {/* Manual URL Input */}
              {(!modal.githubUser || modal.showManualInput) && !modal.validatedRepo && (
                <div className="space-y-3">
                  {modal.showManualInput && modal.githubUser && (
                    <button
                      onClick={() => modal.setShowManualInput(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Back to repository list
                    </button>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Repository URL
                    </label>
                    <input
                      type="text"
                      value={modal.repoUrl}
                      onChange={(e) => modal.updateRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      className="
                        w-full px-3 py-2 rounded-lg border border-gray-200
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        text-sm
                      "
                      disabled={modal.isValidating}
                    />
                  </div>
                </div>
              )}

              {/* Validation Error */}
              {modal.validationError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle size={16} className="text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">{modal.validationError}</p>
                </div>
              )}

              {/* Validated Repo Info */}
              {modal.validatedRepo && (
                <ValidatedRepoPreview
                  repo={modal.validatedRepo}
                  repoUrl={modal.repoUrl}
                  onClear={modal.clearValidatedRepo}
                />
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
              {!modal.validatedRepo && modal.showManualInput ? (
                <button
                  onClick={modal.validateRepo}
                  disabled={modal.isValidating || !modal.repoUrl.trim()}
                  className="
                    px-4 py-2 rounded-lg text-sm font-medium
                    bg-gray-900 text-white hover:bg-gray-800
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors flex items-center gap-2
                  "
                >
                  {modal.isValidating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate'
                  )}
                </button>
              ) : modal.validatedRepo ? (
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

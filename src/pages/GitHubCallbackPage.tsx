/**
 * GitHub OAuth Callback Page
 * Handles the redirect from GitHub after OAuth authorization
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GitBranch, Check, AlertCircle, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function GitHubCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setStatus('error')
      setError(searchParams.get('error_description') || 'Authorization denied')
      return
    }

    if (!code || !state) {
      setStatus('error')
      setError('Invalid callback parameters')
      return
    }

    // Exchange code for token
    const exchangeToken = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/github/oauth/callback?code=${code}&state=${state}`, {
          method: 'POST',
        })

        const data = await response.json()

        if (data.success && data.access_token) {
          // Store token in sessionStorage
          sessionStorage.setItem('github_token', data.access_token)
          if (data.username) {
            sessionStorage.setItem('github_username', data.username)
            setUsername(data.username)
          }
          if (data.avatar_url) {
            sessionStorage.setItem('github_avatar', data.avatar_url)
          }

          setStatus('success')

          // Redirect back to projects page after a short delay
          setTimeout(() => {
            navigate('/projects?github_connected=true')
          }, 1500)
        } else {
          setStatus('error')
          setError(data.error || 'Failed to complete authentication')
        }
      } catch (_err) {
        setStatus('error')
        setError('Failed to connect to server')
      }
    }

    exchangeToken()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {/* GitHub Icon */}
        <div className={`
          w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center
          ${status === 'loading' ? 'bg-gray-100' : ''}
          ${status === 'success' ? 'bg-green-100' : ''}
          ${status === 'error' ? 'bg-red-100' : ''}
        `}>
          {status === 'loading' && (
            <Loader2 size={32} className="text-gray-600 animate-spin" />
          )}
          {status === 'success' && (
            <Check size={32} className="text-green-600" />
          )}
          {status === 'error' && (
            <AlertCircle size={32} className="text-red-600" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {status === 'loading' && 'Connecting to GitHub...'}
          {status === 'success' && 'Connected!'}
          {status === 'error' && 'Connection Failed'}
        </h1>

        {/* Message */}
        <p className="text-gray-500 mb-6">
          {status === 'loading' && 'Please wait while we complete the authentication.'}
          {status === 'success' && (
            <>
              Welcome, <span className="font-medium text-gray-900">{username}</span>!
              <br />
              Redirecting to projects...
            </>
          )}
          {status === 'error' && error}
        </p>

        {/* Actions */}
        {status === 'error' && (
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back to Projects
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* GitHub branding */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
          <GitBranch size={16} />
          <span className="text-sm">GitHub OAuth</span>
        </div>
      </div>
    </div>
  )
}

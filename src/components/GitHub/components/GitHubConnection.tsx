/**
 * GitHubConnection Component
 * Shared component for GitHub OAuth connection status
 */

import { User, LogOut, Lock, GitBranch, Loader2 } from 'lucide-react'
import { GitHubUser } from '../types'

interface GitHubConnectionProps {
  githubUser: GitHubUser | null
  isConnecting: boolean
  onConnect: () => void
  onDisconnect: () => void
  variant?: 'compact' | 'full'
}

export default function GitHubConnection({
  githubUser,
  isConnecting,
  onConnect,
  onDisconnect,
  variant = 'compact',
}: GitHubConnectionProps) {
  if (githubUser) {
    return (
      <div className={`
        p-3 rounded-lg flex items-center justify-between
        ${variant === 'compact' ? 'bg-green-50' : 'bg-green-50 border border-green-200'}
      `}>
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
              {variant === 'full' ? `Connected as @${githubUser.username}` : githubUser.username}
            </p>
            {variant === 'compact' && (
              <p className="text-xs text-green-600">Connected to GitHub</p>
            )}
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className={`
            p-2 hover:bg-green-100 rounded-lg transition-colors
            ${variant === 'full' ? 'text-xs text-green-600 hover:text-green-800 flex items-center gap-1' : ''}
          `}
          title="Disconnect"
        >
          <LogOut size={variant === 'full' ? 14 : 16} className="text-green-600" />
          {variant === 'full' && 'Disconnect'}
        </button>
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <button
        onClick={onConnect}
        disabled={isConnecting}
        className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isConnecting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <GitBranch size={18} />
        )}
        Connect with GitHub
      </button>
    )
  }

  return (
    <div className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-600">
        <Lock size={16} />
        <span className="text-sm">Connect to access private repos</span>
      </div>
      <button
        onClick={onConnect}
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
    </div>
  )
}

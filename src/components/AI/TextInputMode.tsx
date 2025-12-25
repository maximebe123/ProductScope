/**
 * Text input mode for AI diagram generation
 */

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import type { GenerationStatus } from '../../types/ai'

interface TextInputModeProps {
  status: GenerationStatus
  error: string | null
  onGenerate: (description: string) => void
}

export function TextInputMode({ status, error, onGenerate }: TextInputModeProps) {
  const [description, setDescription] = useState('')

  const isLoading = status === 'generating'
  const canSubmit = description.trim().length >= 10 && !isLoading

  const handleSubmit = () => {
    if (canSubmit) {
      onGenerate(description.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && canSubmit) {
      handleSubmit()
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Describe your architecture
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., A microservices e-commerce platform with React frontend, API gateway, user service, product catalog, shopping cart, Redis cache, and PostgreSQL databases"
          className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500">
          {description.length < 10
            ? `${10 - description.length} more characters needed`
            : `${description.length.toLocaleString()} characters`}
          {' • '}
          <span className="text-gray-400">⌘+Enter to generate</span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-3 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Generating diagram...
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Generate Diagram
          </>
        )}
      </button>
    </div>
  )
}

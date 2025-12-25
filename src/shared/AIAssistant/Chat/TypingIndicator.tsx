/**
 * Typing Indicator Component
 * Shows animated dots when AI is processing
 */

import { memo } from 'react'
import { Sparkles } from 'lucide-react'

interface TypingIndicatorProps {
  message?: string
}

function TypingIndicator({ message = 'Thinking' }: TypingIndicatorProps) {
  return (
    <div className="flex gap-2 animate-message-in">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
        <Sparkles size={14} className="text-gray-600" />
      </div>

      {/* Typing bubble */}
      <div className="bg-gray-100 rounded-xl rounded-bl-sm px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{message}</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing-dot" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing-dot" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing-dot" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(TypingIndicator)

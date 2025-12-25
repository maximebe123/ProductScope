/**
 * Chat Input Component
 * Text input with send button (text only, no voice)
 * Supports single-line (input) and multiline (textarea) modes
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isProcessing?: boolean
  placeholder?: string
  multiline?: boolean
  rows?: number
}

function ChatInput({
  onSend,
  disabled = false,
  isProcessing = false,
  placeholder = 'Describe your changes...',
  multiline = false,
  rows = 2,
}: ChatInputProps) {
  const [inputText, setInputText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = inputText.trim().length > 0 && !disabled && !isProcessing

  const handleSend = useCallback(() => {
    if (!canSend) return
    onSend(inputText.trim())
    setInputText('')
  }, [inputText, canSend, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Focus input when not processing
  useEffect(() => {
    if (!isProcessing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus()
      } else if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }, [isProcessing, multiline])

  return (
    <div className={`flex gap-2 ${multiline ? 'items-end' : 'items-center'}`}>
      {/* Text Input */}
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isProcessing}
          rows={rows}
          className="
            flex-1 px-4 py-2.5
            bg-gray-50 border border-gray-200
            rounded-xl text-sm resize-none
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isProcessing}
          className="
            flex-1 px-4 py-2.5
            bg-gray-50 border border-gray-200
            rounded-full text-sm
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        />
      )}

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`
          w-10 h-10 rounded-full flex-shrink-0
          flex items-center justify-center
          transition-all duration-200
          ${canSend
            ? 'bg-primary text-white hover:bg-primary/90 active:scale-95'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
        aria-label="Send message"
      >
        {isProcessing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Send size={18} />
        )}
      </button>
    </div>
  )
}

export default memo(ChatInput)

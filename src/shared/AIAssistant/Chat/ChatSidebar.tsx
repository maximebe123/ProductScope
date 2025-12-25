/**
 * Chat Sidebar
 * Full-height resizable sidebar for chat experience (right side)
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react'
import { MessageSquare, ChevronRight, Plus, Sparkles, Zap } from 'lucide-react'
import { useAIAssistantContext } from '../AIAssistantProvider'
import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'
import ConfirmDialog from '../../components/ConfirmDialog'

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const MIN_WIDTH = 280
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 380

function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const {
    messages,
    chatStatus,
    sendTextMessage,
    clearMessages,
    aiMode,
    setAIMode,
    // Streaming state
    isStreaming,
    streamingAgent,
    streamingContent,
    agentProgress,
  } = useAIAssistantContext()

  const sidebarRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Handle New Chat button click
  const handleNewChatClick = useCallback(() => {
    if (messages.length === 0) {
      // No messages, nothing to clear
      return
    }
    setShowConfirmDialog(true)
  }, [messages.length])

  // Handle confirmation
  const handleConfirmNewChat = useCallback(() => {
    clearMessages()
    setShowConfirmDialog(false)
  }, [clearMessages])

  // Handle cancel
  const handleCancelNewChat = useCallback(() => {
    setShowConfirmDialog(false)
  }, [])

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onToggle])

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      const rect = sidebarRef.current.getBoundingClientRect()
      // For right-side sidebar: width = right edge - mouse position
      const newWidth = rect.right - e.clientX
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const isProcessing = chatStatus === 'generating'

  // Determine typing indicator message
  const getTypingMessage = () => {
    switch (chatStatus) {
      case 'generating':
        return 'Thinking'
      default:
        return 'Processing'
    }
  }

  return (
    <aside
      ref={sidebarRef}
      style={{ width: isOpen ? width : 0 }}
      className={`
        relative h-full flex-shrink-0 overflow-visible
        ${isResizing ? '' : 'transition-[width] duration-300 ease-in-out'}
      `}
    >
      {/* Toggle Button - tab on the left edge (becomes menu when open) */}
      <div
        className={`
          absolute top-1/2 -translate-y-1/2 z-10
          left-0 -translate-x-full
          bg-white shadow-lg
          border border-gray-100 border-r-0
          flex flex-col items-center
          ${isOpen ? 'rounded-l-2xl py-1.5 px-1.5 gap-1' : 'rounded-l-full pl-1.5 pr-1 py-1.5'}
        `}
      >
        {/* New Chat Button - only visible when open */}
        {isOpen && (
          <button
            onClick={handleNewChatClick}
            disabled={messages.length === 0}
            className={`
              w-9 h-9 rounded-full
              flex items-center justify-center
              transition-all duration-200
              ${messages.length === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10 active:scale-95'
              }
            `}
            aria-label="New Chat"
            title="New Chat"
          >
            <Plus size={18} />
          </button>
        )}

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={`
            ${isOpen ? 'w-9 h-9' : 'w-11 h-11'} rounded-full
            flex items-center justify-center
            transition-all duration-200
            bg-primary/10 text-primary hover:bg-primary/20 active:scale-95
          `}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          {isOpen ? (
            <ChevronRight size={18} />
          ) : (
            <MessageSquare size={20} />
          )}
        </button>
      </div>

      {/* Content wrapper with overflow hidden */}
      <div
        className={`
          h-full bg-white border-l border-gray-200
          flex flex-col overflow-hidden
          ${isOpen ? '' : 'invisible'}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Chat</h2>
            <p className="text-xs text-gray-500">Describe your changes</p>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatHistory
            messages={messages}
            isTyping={isProcessing}
            typingMessage={getTypingMessage()}
            isStreaming={isStreaming}
            streamingAgent={streamingAgent}
            streamingContent={streamingContent}
            agentProgress={agentProgress}
          />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100">
          <ChatInput
            onSend={sendTextMessage}
            disabled={false}
            isProcessing={isProcessing}
            placeholder="Type your message..."
            multiline={true}
            rows={2}
          />
          <p className="text-xs text-center text-gray-400 mt-2">
            Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Resize Handle - only when open */}
      {isOpen && (
        <div
          onMouseDown={handleMouseDown}
          className={`
            absolute top-0 left-0 w-1 h-full z-10
            cursor-ew-resize
            hover:bg-primary/30
            ${isResizing ? 'bg-primary/50' : 'bg-transparent'}
            transition-colors
          `}
        />
      )}

      {/* Mode Toggle Tab - separate floating element lower on the sidebar */}
      {isOpen && (
        <div
          className="
            absolute bottom-20 z-10
            left-0 -translate-x-full
            bg-white shadow-lg
            border border-gray-100 border-r-0
            rounded-l-2xl
            p-1
          "
        >
          <div
            className="flex flex-col rounded-full bg-gray-100 p-0.5"
            role="radiogroup"
            aria-label="AI Mode"
          >
            <button
              onClick={() => setAIMode('advanced')}
              className={`
                w-8 h-8 rounded-full
                flex items-center justify-center
                transition-all duration-200
                ${aiMode === 'advanced'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-400 hover:bg-gray-200'
                }
              `}
              aria-label="Advanced Mode"
              aria-checked={aiMode === 'advanced'}
              role="radio"
              title="Advanced Mode (slower, more thorough)"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={() => setAIMode('quick')}
              className={`
                w-8 h-8 rounded-full
                flex items-center justify-center
                transition-all duration-200
                ${aiMode === 'quick'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-400 hover:bg-gray-200'
                }
              `}
              aria-label="Quick Mode"
              aria-checked={aiMode === 'quick'}
              role="radio"
              title="Quick Mode (faster, simpler)"
            >
              <Zap size={16} />
            </button>
          </div>
        </div>
      )}

      {/* New Chat Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        type="warning"
        title="Start New Chat?"
        message="This will clear your current conversation. This action cannot be undone."
        confirmLabel="New Chat"
        cancelLabel="Cancel"
        onConfirm={handleConfirmNewChat}
        onCancel={handleCancelNewChat}
      />
    </aside>
  )
}

export default memo(ChatSidebar)

/**
 * Chat Panel
 * Dedicated chat experience with message history and text input
 */

import { memo, useEffect, useRef } from 'react'
import { X, MessageCircle } from 'lucide-react'
import { useAIAssistantContext } from '../AIAssistantProvider'
import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'

function ChatPanel() {
  const {
    activeMode,
    closePanel,
    messages,
    chatStatus,
    sendTextMessage,
    // Streaming state
    isStreaming,
    streamingAgent,
    streamingContent,
    agentProgress,
  } = useAIAssistantContext()

  const panelRef = useRef<HTMLDivElement>(null)

  // Focus panel when opened
  useEffect(() => {
    if (activeMode === 'chat' && panelRef.current) {
      panelRef.current.focus()
    }
  }, [activeMode])

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeMode === 'chat') {
        closePanel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeMode, closePanel])

  if (activeMode !== 'chat') return null

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
    <div
      ref={panelRef}
      tabIndex={-1}
      className="
        fixed bottom-20 right-4 z-50
        w-96 max-w-[calc(100vw-32px)]
        bg-white rounded-xl shadow-2xl
        flex flex-col
        animate-slide-up-panel
        outline-none
      "
      style={{ height: 'min(500px, calc(100vh - 120px))' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageCircle size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              AI Chat
            </h2>
            <p className="text-xs text-gray-500">
              Describe your changes
            </p>
          </div>
        </div>

        <button
          onClick={closePanel}
          className="
            p-2 -mr-2
            text-gray-400 hover:text-gray-600
            hover:bg-gray-100 rounded-lg
            transition-colors
          "
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Chat Content Area */}
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
        />
        <p className="text-xs text-center text-gray-400 mt-2">
          Press Enter to send
        </p>
      </div>
    </div>
  )
}

export default memo(ChatPanel)

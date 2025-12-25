/**
 * Chat History Component
 * Scrollable container for messages with auto-scroll
 * Supports real-time streaming with ThinkingMessage
 */

import { memo, useRef, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../../../types/ai'
import type { AgentName, AgentProgress } from '../../../services/streamingApi'
import ChatMessage from './ChatMessage'
import TypingIndicator from './TypingIndicator'
import ThinkingMessage from './ThinkingMessage'

interface ChatHistoryProps {
  messages: ChatMessageType[]
  isTyping?: boolean
  typingMessage?: string
  /** Streaming state for thinking visualization */
  isStreaming?: boolean
  streamingAgent?: AgentName | null
  streamingContent?: string
  agentProgress?: AgentProgress[]
}

function ChatHistory({
  messages,
  isTyping = false,
  typingMessage,
  isStreaming = false,
  streamingAgent = null,
  streamingContent = '',
  agentProgress = [],
}: ChatHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive, typing starts, or streaming updates
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, isStreaming, streamingContent])

  // Empty state
  if (messages.length === 0 && !isTyping && !isStreaming) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 px-4">
        <Sparkles size={32} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium">How can I help?</p>
        <p className="text-xs mt-1 text-gray-400">
          Describe what you want to add or change in your diagram
        </p>
        <div className="mt-4 space-y-2 text-xs text-gray-400">
          <p>"Add a PostgreSQL database connected to the API"</p>
          <p>"Create a microservices architecture"</p>
          <p>"Add authentication to the user service"</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto custom-scrollbar p-4 space-y-3"
    >
      {messages
        .filter((message) => {
          // Hide empty pending assistant messages when typing/streaming indicators are shown
          if ((isTyping || isStreaming) && message.role === 'assistant' && message.status === 'pending' && !message.content) {
            return false
          }
          return true
        })
        .map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

      {/* Thinking message for streaming mode */}
      {isStreaming && (
        <ThinkingMessage
          currentAgent={streamingAgent}
          reasoningContent={streamingContent}
          agentProgress={agentProgress}
          isStreaming={isStreaming}
        />
      )}

      {/* Legacy typing indicator (fallback for non-streaming) */}
      {isTyping && !isStreaming && <TypingIndicator message={typingMessage} />}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  )
}

export default memo(ChatHistory)

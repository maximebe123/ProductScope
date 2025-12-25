/**
 * AI Action Buttons
 * Chat button in bottom-right corner
 */

import { memo } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAIAssistantContext } from './AIAssistantProvider'

interface AIActionButtonsProps {
  showChatButton?: boolean
}

function AIActionButtons({ showChatButton = true }: AIActionButtonsProps) {
  const {
    activeMode,
    openChat,
    unreadCount,
  } = useAIAssistantContext()

  // Hide buttons when a panel is open or if chat button is disabled
  if (activeMode !== 'none' || !showChatButton) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white rounded-full shadow-lg px-2 py-1.5 border border-gray-100">
      {/* Chat Button */}
      <button
        onClick={openChat}
        className={`
          relative w-11 h-11 rounded-full
          flex items-center justify-center
          transition-all duration-200
          bg-primary/10 text-primary hover:bg-primary/20 active:scale-95
        `}
        aria-label="Open chat"
        title="Chat Mode"
      >
        <MessageCircle size={20} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}

export default memo(AIActionButtons)

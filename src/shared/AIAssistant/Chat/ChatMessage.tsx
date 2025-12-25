/**
 * Chat Message Component
 * Renders individual messages with different styles for user/assistant
 */

import { memo } from 'react'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../../../types/ai'

// TODO: Get from user context when auth is implemented
const USER_AVATAR_URL = 'https://media.gqmagazine.fr/photos/64b9498193010afab4ecf28a/16:9/w_2336,h_1314,c_limit/Jonathan%20Cohen%20-%20Sentinelle.png'

interface ChatMessageProps {
  message: ChatMessageType
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isPending = message.status === 'pending'

  return (
    <div
      className={`
        flex gap-2 animate-message-in
        ${isUser ? 'flex-row-reverse' : 'flex-row'}
      `}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 self-center rounded-full p-[2px] bg-secondary w-[30px] h-[30px]">
          <div className="w-[26px] h-[26px] rounded-full overflow-hidden bg-white">
            <img
              src={USER_AVATAR_URL}
              alt="User"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 self-center w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
          <Sparkles size={14} />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={`
          max-w-[85%] px-3 py-2 rounded-xl text-sm
          ${isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
          }
          ${isPending ? 'opacity-70' : ''}
        `}
      >
        {/* Message Content */}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {/* Metadata: Action indicator */}
        {message.type === 'action' && message.metadata?.operationType && (
          <div className={`flex items-center gap-1 text-xs mt-1.5 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
            {message.status === 'complete' ? (
              <CheckCircle2 size={12} className="text-green-500" />
            ) : null}
            <span className="capitalize">{message.metadata.operationType}</span>
            {message.metadata.affectedNodes && message.metadata.affectedNodes.length > 0 && (
              <span>• {message.metadata.affectedNodes.length} nodes</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(ChatMessage)

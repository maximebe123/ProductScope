/**
 * Flowchart Chat View
 * Integrated chat interface for the flowchart editor left pane
 */

import { memo } from 'react'
import { useAIAssistantContext } from '../../../../shared/AIAssistant/AIAssistantProvider'
import ChatHistory from '../../../../shared/AIAssistant/Chat/ChatHistory'
import ChatInput from '../../../../shared/AIAssistant/Chat/ChatInput'

function FlowchartChatView() {
  const {
    messages,
    chatStatus,
    sendTextMessage,
  } = useAIAssistantContext()

  const isProcessing = chatStatus === 'generating'

  const getTypingMessage = () => {
    switch (chatStatus) {
      case 'generating':
        return 'Thinking'
      default:
        return 'Processing'
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chat History */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatHistory
          messages={messages}
          isTyping={isProcessing}
          typingMessage={getTypingMessage()}
        />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-gray-50/50">
        <ChatInput
          onSend={sendTextMessage}
          disabled={false}
          isProcessing={isProcessing}
          placeholder="Describe your flowchart changes..."
          multiline
          rows={2}
        />
        <p className="text-xs text-center text-gray-400 mt-2">
          Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

export default memo(FlowchartChatView)

/**
 * Get typing indicator message based on chat status
 */

export type ChatStatus = 'idle' | 'generating' | 'error' | 'listening' | 'processing'

export function getTypingMessage(chatStatus: ChatStatus): string {
  switch (chatStatus) {
    case 'generating':
      return 'Thinking'
    default:
      return 'Processing'
  }
}

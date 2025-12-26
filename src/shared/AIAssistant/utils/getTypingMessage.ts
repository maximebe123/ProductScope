/**
 * Get typing indicator message based on chat status
 */

export type ChatStatus = 'idle' | 'generating' | 'complete' | 'error' | 'listening' | 'processing'

export function getTypingMessage(chatStatus: ChatStatus): string {
  switch (chatStatus) {
    case 'generating':
      return 'Thinking'
    case 'complete':
      return 'Done'
    default:
      return 'Processing'
  }
}

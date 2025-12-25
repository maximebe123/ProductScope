/**
 * Format AI message to be more user-friendly
 * Removes technical IDs but keeps meaningful content
 */
export function formatAIMessage(message: string | null): string {
  if (!message) return 'Done!'

  // Patterns for technical IDs we want to remove
  const technicalPatterns = [
    /reactflow__edge-[^\s,]+/g, // reactflow__edge-node_1bottom-node_0top
    /edge_\d+/g, // edge_0, edge_1
    /node_\d+[^\s,]*/g, // node_0, node_1left
  ]

  let cleaned = message

  // Check if message contains any technical IDs
  const hasTechnicalIds = technicalPatterns.some((pattern) => pattern.test(message))

  if (hasTechnicalIds) {
    // Remove all technical IDs
    for (const pattern of technicalPatterns) {
      cleaned = cleaned.replace(pattern, '')
    }

    // Clean up the result
    cleaned = cleaned
      .replace(/:\s*,/g, ':') // Clean up dangling commas after colon
      .replace(/,\s*,+/g, ',') // Clean up multiple commas
      .replace(/,\s*$/g, '') // Remove trailing comma
      .replace(/:\s*$/g, '.') // Replace trailing colon with period
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // If we stripped too much, extract just the action summary
    if (cleaned.length < 15 || cleaned.endsWith(':') || /:\s*,?\s*$/.test(cleaned)) {
      const colonIndex = message.indexOf(':')
      if (colonIndex > 0) {
        cleaned = message.substring(0, colonIndex).trim() + '.'
      } else {
        cleaned = 'Done!'
      }
    }
  }

  // Handle empty component lists like "Modified 12 component(s): , , , ,"
  if (/:\s*[,\s]+$/.test(cleaned) || /:\s*,/.test(cleaned)) {
    const colonIndex = cleaned.indexOf(':')
    if (colonIndex > 0) {
      cleaned = cleaned.substring(0, colonIndex).trim() + '.'
    }
  }

  return cleaned || 'Done!'
}

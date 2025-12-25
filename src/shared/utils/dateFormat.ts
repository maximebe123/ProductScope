/**
 * Date formatting utilities
 */

/**
 * Format a date string to a localized short format
 * @param dateStr - ISO date string
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 * @param dateStr - ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return 'just now'
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  } else {
    return formatDate(dateStr)
  }
}

/**
 * Format a date to ISO date format (YYYY-MM-DD)
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
export function formatISODate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

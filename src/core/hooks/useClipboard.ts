import { useCallback, useState } from 'react'
import { CanvasItem, ClipboardConfig } from '../types/canvas'

const DEFAULT_PASTE_OFFSET = { x: 50, y: 50 }

/**
 * Generic clipboard hook for copy/paste operations on canvas items
 *
 * @param generateId - Function to generate unique IDs for pasted items
 * @param config - Optional configuration
 * @returns Clipboard operations and state
 *
 * @example
 * ```tsx
 * const { clipboard, hasClipboard, copyItems, getItemsForPaste } = useClipboard(
 *   () => `node_${Date.now()}`
 * )
 *
 * // Copy selected nodes
 * const handleCopy = () => {
 *   const selected = nodes.filter(n => n.selected)
 *   copyItems(selected)
 * }
 *
 * // Paste nodes
 * const handlePaste = () => {
 *   const newNodes = getItemsForPaste()
 *   setNodes([...nodes, ...newNodes])
 * }
 * ```
 */
export function useClipboard<T extends CanvasItem>(
  generateId: () => string,
  config: ClipboardConfig = {}
) {
  const defaultOffset = config.defaultOffset ?? DEFAULT_PASTE_OFFSET

  const [clipboard, setClipboard] = useState<T[]>([])

  /**
   * Copy items to clipboard (deep clone)
   */
  const copyItems = useCallback((items: T[]) => {
    if (items.length > 0) {
      setClipboard(JSON.parse(JSON.stringify(items)))
    }
  }, [])

  /**
   * Get items ready for paste with new IDs and offset positions
   * Does not modify clipboard - can paste multiple times
   *
   * @param offset - Position offset for pasted items (default: 50, 50)
   * @param clearParent - Whether to clear parent relationships (default: true)
   * @returns New items ready to add to canvas
   */
  const getItemsForPaste = useCallback(
    (
      offset: { x: number; y: number } = defaultOffset,
      clearParent: boolean = true
    ): T[] => {
      if (clipboard.length === 0) return []

      return clipboard.map((item) => {
        const newItem: T = {
          ...item,
          id: generateId(),
          position: {
            x: item.position.x + offset.x,
            y: item.position.y + offset.y,
          },
          selected: true,
        }

        // Clear parent relationships if specified (for ReactFlow nodes)
        if (clearParent) {
          const anyItem = newItem as Record<string, unknown>
          delete anyItem.parentNode
          delete anyItem.extent
          delete anyItem.expandParent
        }

        return newItem
      })
    },
    [clipboard, generateId, defaultOffset]
  )

  /**
   * Get items for duplication (same as paste but uses provided items)
   * Useful for Ctrl+D duplicate functionality
   *
   * @param items - Items to duplicate
   * @param offset - Position offset
   * @param clearParent - Whether to clear parent relationships
   * @returns New duplicated items
   */
  const duplicateItems = useCallback(
    (
      items: T[],
      offset: { x: number; y: number } = defaultOffset,
      clearParent: boolean = true
    ): T[] => {
      if (items.length === 0) return []

      return items.map((item) => {
        const newItem: T = {
          ...JSON.parse(JSON.stringify(item)),
          id: generateId(),
          position: {
            x: item.position.x + offset.x,
            y: item.position.y + offset.y,
          },
          selected: true,
        }

        if (clearParent) {
          const anyItem = newItem as Record<string, unknown>
          delete anyItem.parentNode
          delete anyItem.extent
          delete anyItem.expandParent
        }

        return newItem
      })
    },
    [generateId, defaultOffset]
  )

  /**
   * Clear clipboard
   */
  const clearClipboard = useCallback(() => {
    setClipboard([])
  }, [])

  return {
    clipboard,
    hasClipboard: clipboard.length > 0,
    copyItems,
    getItemsForPaste,
    duplicateItems,
    clearClipboard,
  }
}

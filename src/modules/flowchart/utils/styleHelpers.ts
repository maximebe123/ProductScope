/**
 * Style Helpers for Mermaid Flowcharts
 * Utilities for generating and parsing Mermaid styling syntax
 */

import { PRESET_COLORS } from '../../../shared/constants/colors'

// Re-export for backwards compatibility
export { PRESET_COLORS }

export interface NodeStyleOptions {
  fill?: string
  stroke?: string
  strokeWidth?: number
  color?: string
  strokeDasharray?: string
}

export interface ClassDefinition {
  name: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  color?: string
}

export interface ParsedStyles {
  nodeStyles: Map<string, NodeStyleOptions>
  classDefs: Map<string, NodeStyleOptions>
  classAssignments: Map<string, string[]>
  linkStyles: Map<number | 'default', NodeStyleOptions>
}

// Predefined style themes
export const STYLE_THEMES = [
  {
    id: 'default',
    name: 'Default',
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 2,
  },
  {
    id: 'primary',
    name: 'Primary',
    fill: '#e8eeff',
    stroke: '#0230a8',
    strokeWidth: 2,
  },
  {
    id: 'success',
    name: 'Success',
    fill: '#d1fae5',
    stroke: '#10b981',
    strokeWidth: 2,
  },
  {
    id: 'warning',
    name: 'Warning',
    fill: '#fef3c7',
    stroke: '#f59e0b',
    strokeWidth: 2,
  },
  {
    id: 'danger',
    name: 'Danger',
    fill: '#fee2e2',
    stroke: '#ef4444',
    strokeWidth: 2,
  },
  {
    id: 'info',
    name: 'Info',
    fill: '#cffafe',
    stroke: '#06b6d4',
    strokeWidth: 2,
  },
  {
    id: 'purple',
    name: 'Purple',
    fill: '#ede9fe',
    stroke: '#8b5cf6',
    strokeWidth: 2,
  },
  {
    id: 'highlight',
    name: 'Highlight',
    fill: '#ffcf00',
    stroke: '#0230a8',
    strokeWidth: 3,
  },
]

/**
 * Generate a style line for a single node
 */
export function generateNodeStyle(nodeId: string, options: NodeStyleOptions): string {
  const parts: string[] = []

  if (options.fill) parts.push(`fill:${options.fill}`)
  if (options.stroke) parts.push(`stroke:${options.stroke}`)
  if (options.strokeWidth) parts.push(`stroke-width:${options.strokeWidth}px`)
  if (options.color) parts.push(`color:${options.color}`)
  if (options.strokeDasharray) parts.push(`stroke-dasharray:${options.strokeDasharray}`)

  if (parts.length === 0) return ''
  return `style ${nodeId} ${parts.join(',')}`
}

/**
 * Generate a style line for multiple nodes
 */
export function generateMultiNodeStyle(nodeIds: string[], options: NodeStyleOptions): string {
  const parts: string[] = []

  if (options.fill) parts.push(`fill:${options.fill}`)
  if (options.stroke) parts.push(`stroke:${options.stroke}`)
  if (options.strokeWidth) parts.push(`stroke-width:${options.strokeWidth}px`)
  if (options.color) parts.push(`color:${options.color}`)

  if (parts.length === 0) return ''
  return `style ${nodeIds.join(',')} ${parts.join(',')}`
}

/**
 * Generate a classDef line
 */
export function generateClassDef(className: string, options: NodeStyleOptions): string {
  const parts: string[] = []

  if (options.fill) parts.push(`fill:${options.fill}`)
  if (options.stroke) parts.push(`stroke:${options.stroke}`)
  if (options.strokeWidth) parts.push(`stroke-width:${options.strokeWidth}px`)
  if (options.color) parts.push(`color:${options.color}`)

  if (parts.length === 0) return ''
  return `classDef ${className} ${parts.join(',')}`
}

/**
 * Generate a class assignment line
 */
export function generateClassAssignment(nodeIds: string[], className: string): string {
  return `class ${nodeIds.join(',')} ${className}`
}

/**
 * Generate a link style line
 */
export function generateLinkStyle(
  linkIndex: number | 'default',
  options: NodeStyleOptions
): string {
  const parts: string[] = []

  if (options.stroke) parts.push(`stroke:${options.stroke}`)
  if (options.strokeWidth) parts.push(`stroke-width:${options.strokeWidth}px`)

  if (parts.length === 0) return ''
  return `linkStyle ${linkIndex} ${parts.join(',')}`
}

/**
 * Parse existing styles from Mermaid code
 */
export function parseStyles(code: string): ParsedStyles {
  const nodeStyles = new Map<string, NodeStyleOptions>()
  const classDefs = new Map<string, NodeStyleOptions>()
  const classAssignments = new Map<string, string[]>()
  const linkStyles = new Map<number | 'default', NodeStyleOptions>()

  const lines = code.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Parse style statements: style A fill:#fff,stroke:#333
    const styleMatch = trimmed.match(/^style\s+([\w,]+)\s+(.+)$/)
    if (styleMatch) {
      const [, nodeIdsPart, stylesPart] = styleMatch
      const nodeIds = nodeIdsPart.split(',')
      const options = parseStyleString(stylesPart)

      for (const nodeId of nodeIds) {
        nodeStyles.set(nodeId.trim(), options)
      }
      continue
    }

    // Parse classDef statements: classDef className fill:#fff
    const classDefMatch = trimmed.match(/^classDef\s+(\w+)\s+(.+)$/)
    if (classDefMatch) {
      const [, className, stylesPart] = classDefMatch
      classDefs.set(className, parseStyleString(stylesPart))
      continue
    }

    // Parse class assignments: class A,B className
    const classMatch = trimmed.match(/^class\s+([\w,]+)\s+(\w+)$/)
    if (classMatch) {
      const [, nodeIdsPart, className] = classMatch
      const nodeIds = nodeIdsPart.split(',').map((id) => id.trim())
      classAssignments.set(className, nodeIds)
      continue
    }

    // Parse linkStyle statements: linkStyle 0 stroke:#333
    const linkStyleMatch = trimmed.match(/^linkStyle\s+(default|\d+)\s+(.+)$/)
    if (linkStyleMatch) {
      const [, indexPart, stylesPart] = linkStyleMatch
      const index = indexPart === 'default' ? 'default' : parseInt(indexPart, 10)
      linkStyles.set(index, parseStyleString(stylesPart))
    }
  }

  return { nodeStyles, classDefs, classAssignments, linkStyles }
}

/**
 * Parse a style string like "fill:#fff,stroke:#333" into an options object
 */
function parseStyleString(styleStr: string): NodeStyleOptions {
  const options: NodeStyleOptions = {}

  const parts = styleStr.split(',')
  for (const part of parts) {
    const [key, value] = part.split(':').map((s) => s.trim())
    if (!key || !value) continue

    switch (key) {
      case 'fill':
        options.fill = value
        break
      case 'stroke':
        options.stroke = value
        break
      case 'stroke-width':
        options.strokeWidth = parseInt(value, 10)
        break
      case 'color':
        options.color = value
        break
      case 'stroke-dasharray':
        options.strokeDasharray = value
        break
    }
  }

  return options
}

/**
 * Insert or update a style line in the Mermaid code
 */
export function insertStyleInCode(
  code: string,
  styleLine: string
): string {
  const lines = code.split('\n')

  // Find the best position to insert the style
  // Prefer adding after all node/edge definitions, before any existing styles
  let insertIndex = lines.length

  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (
      trimmed.startsWith('style ') ||
      trimmed.startsWith('classDef ') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('linkStyle ')
    ) {
      insertIndex = i + 1
      break
    }
    if (trimmed === '' || trimmed === 'end') {
      insertIndex = i
    }
  }

  // Check if we're inserting before any style lines
  let foundStyleSection = false
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (
      trimmed.startsWith('style ') ||
      trimmed.startsWith('classDef ') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('linkStyle ')
    ) {
      foundStyleSection = true
      insertIndex = i
      break
    }
  }

  if (!foundStyleSection) {
    // Add a blank line before styles if none exist
    lines.splice(insertIndex, 0, '', '    ' + styleLine)
  } else {
    lines.splice(insertIndex, 0, '    ' + styleLine)
  }

  return lines.join('\n')
}

/**
 * Remove all styles for a specific node from the code
 */
export function removeNodeStyleFromCode(code: string, nodeId: string): string {
  const lines = code.split('\n')

  return lines
    .filter((line) => {
      const trimmed = line.trim()
      // Remove direct style for this node
      if (trimmed.startsWith(`style ${nodeId} `)) return false
      // Remove class assignment for this node (simple case)
      if (trimmed === `class ${nodeId}`) return false
      return true
    })
    .join('\n')
}

/**
 * Get all node IDs from parsed Mermaid code
 */
export function extractNodeIds(code: string): string[] {
  const nodeIds: string[] = []
  const lines = code.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip non-node lines
    if (
      trimmed.startsWith('flowchart') ||
      trimmed.startsWith('graph') ||
      trimmed.startsWith('subgraph') ||
      trimmed.startsWith('end') ||
      trimmed.startsWith('style') ||
      trimmed.startsWith('classDef') ||
      trimmed.startsWith('class') ||
      trimmed.startsWith('linkStyle') ||
      trimmed === ''
    ) {
      continue
    }

    // Extract node IDs from definitions and edges
    // Match patterns like: A[Label], A([Label]), A{Label}, A --> B, etc.
    const matches = trimmed.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*[[({>@]/g)
    for (const match of matches) {
      if (!nodeIds.includes(match[1])) {
        nodeIds.push(match[1])
      }
    }

    // Also match target nodes in edges: A --> B
    const edgeMatches = trimmed.matchAll(/--[>|]?\s*(?:\|[^|]+\|)?\s*([A-Za-z_][A-Za-z0-9_]*)/g)
    for (const match of edgeMatches) {
      if (!nodeIds.includes(match[1])) {
        nodeIds.push(match[1])
      }
    }
  }

  return nodeIds
}
